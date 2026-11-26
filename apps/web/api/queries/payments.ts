import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import type {
  InitializePaymentResult,
  PaymentCardDto,
  TransactionDto,
  VerifyPaymentResult,
} from "@contracts/types";
import {
  merchants,
  notifications,
  orderEvents,
  orders,
  paymentCards,
  transactions,
  users,
} from "@db/schema";
import { env } from "../lib/env";
import { log } from "../lib/logger";
import { getDb } from "./connection";

// ── Payments: Paystack hosted checkout + saved cards + ledger ──────
// Only display-safe card fields (brand/last4/expiry/bank) are stored —
// never PAN or CVV. The reusable authorization_code is what lets us
// charge a saved card again; it is never sent to the client.

const PAYSTACK_API = "https://api.paystack.co";

function noGateway(): TRPCError {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "Card payments are being connected — choose cash on delivery for now.",
  });
}

function newReference(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(6).toString("hex")}`;
}

// ── Transaction recording ──────────────────────────────────────────

/** Every order gets a transaction row — COD included, so the
 *  Transactions page is a complete money history. */
export async function recordOrderTransaction(args: {
  userId: string;
  orderId: string;
  provider: "cod" | "paystack" | "flutterwave";
  amountKobo: bigint;
  reference?: string;
}): Promise<string> {
  const db = getDb();
  const reference =
    args.reference ?? newReference(args.provider === "cod" ? "COD" : "PAY");
  await db.insert(transactions).values({
    userId: args.userId,
    orderId: args.orderId,
    provider: args.provider,
    reference,
    amountKobo: args.amountKobo,
    status: "pending",
    channel: args.provider === "cod" ? "cash" : "",
  });
  return reference;
}

export async function listTransactions(userId: string): Promise<TransactionDto[]> {
  const db = getDb();
  const rows = await db
    .select({
      tx: transactions,
      orderRef: orders.humanRef,
      merchantName: merchants.name,
    })
    .from(transactions)
    .leftJoin(orders, eq(transactions.orderId, orders.id))
    .leftJoin(merchants, eq(orders.merchantId, merchants.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(100);
  return rows.map(({ tx, orderRef, merchantName }) => ({
    id: tx.id,
    orderId: tx.orderId,
    orderRef,
    merchantName,
    provider: tx.provider,
    reference: tx.reference,
    amountKobo: Number(tx.amountKobo),
    status: tx.status,
    channel: tx.channel,
    cardBrand: tx.cardBrand,
    cardLast4: tx.cardLast4,
    paidAt: tx.paidAt?.toISOString() ?? null,
    createdAt: tx.createdAt.toISOString(),
  }));
}

// ── Saved cards ────────────────────────────────────────────────────

export async function listCards(userId: string): Promise<PaymentCardDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(paymentCards)
    .where(eq(paymentCards.userId, userId))
    .orderBy(desc(paymentCards.isDefault), desc(paymentCards.createdAt));
  return rows.map((c) => ({
    id: c.id,
    provider: c.provider === "flutterwave" ? "flutterwave" : "paystack",
    last4: c.last4,
    brand: c.brand,
    bank: c.bank,
    expMonth: c.expMonth,
    expYear: c.expYear,
    isDefault: c.isDefault,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function removeCard(userId: string, cardId: string): Promise<void> {
  const db = getDb();
  const removed = await db
    .delete(paymentCards)
    .where(and(eq(paymentCards.id, cardId), eq(paymentCards.userId, userId)))
    .returning({ id: paymentCards.id });
  if (!removed[0]) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Card not found." });
  }
}

export async function setDefaultCard(userId: string, cardId: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: paymentCards.id })
      .from(paymentCards)
      .where(and(eq(paymentCards.id, cardId), eq(paymentCards.userId, userId)))
      .limit(1);
    if (!owned) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Card not found." });
    }
    await tx
      .update(paymentCards)
      .set({ isDefault: false })
      .where(eq(paymentCards.userId, userId));
    await tx
      .update(paymentCards)
      .set({ isDefault: true })
      .where(eq(paymentCards.id, cardId));
  });
}

// ── Paystack API helpers ───────────────────────────────────────────

interface PaystackAuthorization {
  authorization_code?: string;
  last4?: string;
  brand?: string;
  bank?: string;
  exp_month?: string;
  exp_year?: string;
  reusable?: boolean;
  channel?: string;
}

interface PaystackVerifyData {
  status: string;
  reference: string;
  amount: number;
  channel?: string;
  paid_at?: string;
  customer?: { email?: string };
  authorization?: PaystackAuthorization;
  metadata?: { orderId?: string; userId?: string };
}

async function paystackFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: T;
  } | null;
  if (!res.ok || !body?.status) {
    log.error("Paystack API failure", { path, status: res.status, body });
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: body?.message ?? "The payment gateway is unreachable — try again.",
    });
  }
  return body.data as T;
}

/** Persist the paid state: transaction, order, saved card, notifications.
 *  Idempotent — safe to call from both verify and the webhook. */
async function fulfillSuccessfulCharge(
  data: PaystackVerifyData,
): Promise<{ orderId: string | null; orderRef: string | null }> {
  const db = getDb();
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.reference, data.reference))
    .limit(1);
  if (!tx) {
    log.error("Paystack success for unknown reference", { ref: data.reference });
    return { orderId: null, orderRef: null };
  }
  if (tx.status === "success") {
    // Already fulfilled (webhook + verify race) — answer from state.
    const [o] = tx.orderId
      ? await db
          .select({ id: orders.id, humanRef: orders.humanRef })
          .from(orders)
          .where(eq(orders.id, tx.orderId))
          .limit(1)
      : [null];
    return { orderId: o?.id ?? null, orderRef: o?.humanRef ?? null };
  }
  if (data.status !== "success") {
    await db
      .update(transactions)
      .set({ status: data.status === "failed" ? "failed" : "abandoned" })
      .where(eq(transactions.id, tx.id));
    return { orderId: tx.orderId, orderRef: null };
  }

  const auth = data.authorization ?? {};
  const now = new Date();
  await db.transaction(async (dbtx) => {
    await dbtx
      .update(transactions)
      .set({
        status: "success",
        channel: data.channel ?? "card",
        cardBrand: auth.brand ?? "",
        cardLast4: auth.last4 ?? "",
        paidAt: now,
      })
      .where(eq(transactions.id, tx.id));

    let orderRef: string | null = null;
    if (tx.orderId) {
      const updated = await dbtx
        .update(orders)
        .set({ paymentStatus: "paid", paymentRef: data.reference, updatedAt: now })
        .where(eq(orders.id, tx.orderId))
        .returning({ humanRef: orders.humanRef, merchantId: orders.merchantId });
      orderRef = updated[0]?.humanRef ?? null;
      await dbtx.insert(orderEvents).values({
        orderId: tx.orderId,
        status: "received",
        actorType: "system",
        note: `Payment confirmed via Paystack (${data.reference})`,
      });
    }

    // Save the card for one-tap checkout next time (reusable auths only).
    if (auth.reusable && auth.authorization_code) {
      await dbtx
        .insert(paymentCards)
        .values({
          userId: tx.userId,
          provider: "paystack",
          authorizationCode: auth.authorization_code,
          last4: auth.last4 ?? "",
          brand: auth.brand ?? "",
          bank: auth.bank ?? "",
          expMonth: auth.exp_month ?? "",
          expYear: auth.exp_year ?? "",
          email: data.customer?.email ?? "",
          isDefault: false,
        })
        .onConflictDoNothing();
    }

    await dbtx.insert(notifications).values({
      userId: tx.userId,
      kind: "order",
      title: "Payment received",
      body: `Your card payment of ₦${(Number(tx.amountKobo) / 100).toLocaleString("en-NG")} went through${orderRef ? ` for order ${orderRef}` : ""}.`,
    });
  });

  const [o] = tx.orderId
    ? await db
        .select({ humanRef: orders.humanRef })
        .from(orders)
        .where(eq(orders.id, tx.orderId))
        .limit(1)
    : [null];
  return { orderId: tx.orderId, orderRef: o?.humanRef ?? null };
}

/** Paystack sends charge.success here; signature = HMAC-SHA512(raw, secret). */
export async function handlePaystackWebhook(
  rawBody: string,
  signature: string | undefined,
): Promise<{ ok: boolean }> {
  if (!env.paystackSecretKey) return { ok: false };
  const expected = createHmac("sha512", env.paystackSecretKey)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    log.error("Paystack webhook signature mismatch");
    return { ok: false };
  }
  try {
    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: PaystackVerifyData;
    };
    if (event.event === "charge.success" && event.data) {
      await fulfillSuccessfulCharge(event.data);
    }
  } catch (err) {
    log.error("Paystack webhook handling failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return { ok: true };
}

// ── Customer-facing payment actions ────────────────────────────────

async function loadOwnedOrder(userId: string, orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({ order: orders, user: users })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  }
  return row;
}

/** Start a Paystack hosted checkout for an unpaid order. */
export async function initializePaystack(args: {
  userId: string;
  orderId: string;
  callbackBase: string;
}): Promise<InitializePaymentResult> {
  if (!env.paystackSecretKey) throw noGateway();
  const db = getDb();
  const { order, user } = await loadOwnedOrder(args.userId, args.orderId);
  if (order.paymentStatus === "paid") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This order is already paid." });
  }

  const email =
    user.email ??
    `${(user.phone ?? "customer").replace(/[^\d]/g, "")}@guest.purplefoods.ng`;
  const reference = newReference("PF");
  await recordOrderTransaction({
    userId: args.userId,
    orderId: order.id,
    provider: "paystack",
    amountKobo: order.totalKobo,
    reference,
  });

  const callbackBase = args.callbackBase.replace(/\/$/, "");
  const data = await paystackFetch<{
    authorization_url: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: Number(order.totalKobo),
      reference,
      callback_url: `${callbackBase}/#/orders/${order.humanRef}?paid=1`,
      metadata: { orderId: order.id, userId: args.userId },
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
  });

  return { authorizationUrl: data.authorization_url, reference: data.reference };
}

/** Verify after the gateway redirects back. Safe to call repeatedly. */
export async function verifyPaystack(
  userId: string,
  reference: string,
): Promise<VerifyPaymentResult> {
  if (!env.paystackSecretKey) throw noGateway();
  const db = getDb();
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.reference, reference))
    .limit(1);
  if (!tx || tx.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found." });
  }
  if (tx.status === "success") {
    const [o] = tx.orderId
      ? await db
          .select({ humanRef: orders.humanRef })
          .from(orders)
          .where(eq(orders.id, tx.orderId))
          .limit(1)
      : [null];
    return { status: "success", orderRef: o?.humanRef ?? null };
  }
  const data = await paystackFetch<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  const result = await fulfillSuccessfulCharge(data);
  return {
    status: data.status === "success" ? "success" : data.status === "failed" ? "failed" : "pending",
    orderRef: result.orderRef,
  };
}

/** One-tap charge on a saved card (Paystack charge_authorization). */
export async function chargeSavedCard(args: {
  userId: string;
  cardId: string;
  orderId: string;
}): Promise<VerifyPaymentResult> {
  if (!env.paystackSecretKey) throw noGateway();
  const db = getDb();
  const { order, user } = await loadOwnedOrder(args.userId, args.orderId);
  if (order.paymentStatus === "paid") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This order is already paid." });
  }
  const [card] = await db
    .select()
    .from(paymentCards)
    .where(and(eq(paymentCards.id, args.cardId), eq(paymentCards.userId, args.userId)))
    .limit(1);
  if (!card) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Card not found." });
  }

  const email =
    card.email ||
    user.email ||
    `${(user.phone ?? "customer").replace(/[^\d]/g, "")}@guest.purplefoods.ng`;
  const reference = newReference("PF");
  await recordOrderTransaction({
    userId: args.userId,
    orderId: order.id,
    provider: "paystack",
    amountKobo: order.totalKobo,
    reference,
  });

  const data = await paystackFetch<PaystackVerifyData>(
    "/transaction/charge_authorization",
    {
      method: "POST",
      body: JSON.stringify({
        authorization_code: card.authorizationCode,
        email,
        amount: Number(order.totalKobo),
        reference,
        metadata: { orderId: order.id, userId: args.userId },
      }),
    },
  );
  const result = await fulfillSuccessfulCharge({ ...data, reference });
  return {
    status: data.status === "success" ? "success" : data.status === "failed" ? "failed" : "pending",
    orderRef: result.orderRef,
  };
}
