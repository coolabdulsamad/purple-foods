import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { PromoCheckDto, PromoCodeDto, ReferralDto } from "@contracts/types";
import { notifications, promoCodes, promoRedemptions, users } from "@db/schema";
import { getDb } from "./connection";

// ── Promo engine + referrals ───────────────────────────────────────
// Codes live in promo_codes (admin-seeded). Referral codes live on
// users.referral_code and behave as a fixed ₦1,000-off first-order
// promo for the friend. All discounts are computed SERVER-SIDE at
// order time — the client only ever displays estimates.

export const REFERRAL_FRIEND_DISCOUNT_KOBO = 100000; // ₦1,000
export const REFERRAL_MIN_ORDER_KOBO = 200000; // ₦2,000

export interface ResolvedPromo {
  /** promo_codes.id when it's a store code; null for referral codes. */
  promoId: string | null;
  code: string;
  kind: "percent" | "fixed" | "free_delivery";
  discountKobo: bigint;
  label: string;
  /** Referrer's user id when a referral code was used. */
  referrerId: string | null;
}

function codeError(message: string): TRPCError {
  return new TRPCError({ code: "BAD_REQUEST", message });
}

function describePromo(p: typeof promoCodes.$inferSelect): string {
  if (p.kind === "percent") return `${p.percentOff}% off your order`;
  if (p.kind === "fixed") return `₦${(Number(p.valueKobo ?? 0) / 100).toLocaleString("en-NG")} off your order`;
  return "Free delivery";
}

/**
 * Validate a code for this user and compute the discount against the
 * given amounts. Throws TRPCError with a customer-readable message for
 * every failure mode. Used by promos.check (display) and orders.create
 * (authoritative).
 */
export async function resolvePromo(
  userId: string,
  rawCode: string,
  subtotalKobo: bigint,
  deliveryFeeKobo: bigint,
): Promise<ResolvedPromo> {
  const db = getDb();
  const code = rawCode.trim().toUpperCase();
  if (!code) throw codeError("Enter a promo code.");

  // ── Store promo codes ────────────────────────────────────────────
  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, code))
    .limit(1);

  if (promo) {
    if (!promo.isActive) throw codeError("That code is no longer active.");
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw codeError("That code has expired.");
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      throw codeError("That code has been fully used up.");
    }
    if (subtotalKobo < promo.minOrderKobo) {
      throw codeError(
        `This code needs a minimum order of ₦${(Number(promo.minOrderKobo) / 100).toLocaleString("en-NG")}.`,
      );
    }
    const [used] = await db
      .select({ id: promoRedemptions.id })
      .from(promoRedemptions)
      .where(
        and(
          eq(promoRedemptions.promoId, promo.id),
          eq(promoRedemptions.userId, userId),
        ),
      )
      .limit(1);
    if (used) throw codeError("You've already used this code.");

    let discount = BigInt(0);
    if (promo.kind === "percent") {
      discount = (subtotalKobo * BigInt(promo.percentOff ?? 0)) / BigInt(100);
    } else if (promo.kind === "fixed") {
      discount = promo.valueKobo ?? BigInt(0);
      if (discount > subtotalKobo) discount = subtotalKobo;
    } else {
      discount = deliveryFeeKobo;
    }
    return {
      promoId: promo.id,
      code,
      kind: promo.kind,
      discountKobo: discount,
      label: describePromo(promo),
      referrerId: null,
    };
  }

  // ── Referral codes (PF-XXXXXX on a user) ─────────────────────────
  const [referrer] = await db
    .select({ id: users.id, referralCode: users.referralCode })
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);

  if (!referrer) {
    throw codeError("That code doesn't match any active promo.");
  }
  if (referrer.id === userId) {
    throw codeError("You can't use your own referral code — share it with a friend.");
  }
  const [me] = await db
    .select({ referredBy: users.referredBy })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (me?.referredBy) {
    throw codeError("You've already used a referral code.");
  }
  if (subtotalKobo < BigInt(REFERRAL_MIN_ORDER_KOBO)) {
    throw codeError(
      `Referral codes need a minimum order of ₦${(REFERRAL_MIN_ORDER_KOBO / 100).toLocaleString("en-NG")}.`,
    );
  }
  const discount = BigInt(REFERRAL_FRIEND_DISCOUNT_KOBO);
  return {
    promoId: null,
    code,
    kind: "fixed",
    discountKobo: discount > subtotalKobo ? subtotalKobo : discount,
    label: `₦${(REFERRAL_FRIEND_DISCOUNT_KOBO / 100).toLocaleString("en-NG")} off — referral reward`,
    referrerId: referrer.id,
  };
}

/** Public estimate for the checkout UI. */
export async function checkPromo(
  userId: string,
  code: string,
  subtotalKobo: number,
  deliveryFeeKobo: number,
): Promise<PromoCheckDto> {
  const resolved = await resolvePromo(
    userId,
    code,
    BigInt(Math.max(0, Math.round(subtotalKobo))),
    BigInt(Math.max(0, Math.round(deliveryFeeKobo))),
  );
  return {
    code: resolved.code,
    kind: resolved.kind,
    discountKobo: Number(resolved.discountKobo),
    label: resolved.label,
  };
}

/** Active store codes for the Promos page (no usage internals). */
export async function listActivePromos(): Promise<PromoCodeDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.isActive, true),
        or(isNull(promoCodes.expiresAt), gt(promoCodes.expiresAt, new Date())),
      ),
    )
    .orderBy(promoCodes.createdAt);
  return rows
    .filter((p) => p.maxUses == null || p.usedCount < p.maxUses)
    .map((p) => ({
      code: p.code,
      kind: p.kind,
      percentOff: p.percentOff,
      valueKobo: p.valueKobo == null ? null : Number(p.valueKobo),
      minOrderKobo: Number(p.minOrderKobo),
    }));
}

/** Deterministic, pronounceable referral code: PF-<6 base32 chars>. */
function generateReferralCode(userId: string): string {
  const digest = createHash("sha256")
    .update(`ref:${userId}:${randomBytes(8).toString("hex")}`)
    .digest();
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[digest[i]! % alphabet.length];
  return `PF-${out}`;
}

/** Lazily mint and return the user's referral code. */
export async function ensureReferralCode(userId: string): Promise<ReferralDto> {
  const db = getDb();
  const [me] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (me?.referralCode) {
    return { code: me.referralCode, friendDiscountKobo: REFERRAL_FRIEND_DISCOUNT_KOBO };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(userId);
    try {
      const updated = await db
        .update(users)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.referralCode)))
        .returning({ referralCode: users.referralCode });
      if (updated[0]) {
        return { code: updated[0].referralCode!, friendDiscountKobo: REFERRAL_FRIEND_DISCOUNT_KOBO };
      }
      // Lost a race — another request minted it; read it back.
      const [now] = await db
        .select({ referralCode: users.referralCode })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (now?.referralCode) {
        return { code: now.referralCode, friendDiscountKobo: REFERRAL_FRIEND_DISCOUNT_KOBO };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("referral_code")) throw err;
    }
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Could not create your referral code — try again.",
  });
}

/** Referrer thank-you when a friend redeems their code. */
export async function notifyReferrer(
  referrerId: string,
  friendName: string,
): Promise<void> {
  const db = getDb();
  await db.insert(notifications).values({
    userId: referrerId,
    kind: "promo",
    title: "Your referral code was used",
    body: `${friendName} just ordered with your code. Thanks for spreading Purple Foods!`,
  });
}
