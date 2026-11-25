import { createHash, createHmac, randomInt, randomBytes, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, gte, isNull } from "drizzle-orm";
import type {
  RequestOtpResult,
  SessionUserDto,
  VerifyOtpResult,
} from "@contracts/types";
import { otpCodes, sessions, users } from "@db/schema";
import { env } from "../lib/env";
import { log } from "../lib/logger";
import { getDb } from "./connection";
import { normalizePhone } from "./orders";

// ── Phone OTP auth ─────────────────────────────────────────────────
// 6-digit codes, HMAC-SHA256 hashed with APP_SECRET (never stored in
// clear), 10-minute TTL, 5 verify attempts, 5 requests per phone per
// hour. Sessions are opaque 256-bit bearer tokens stored as SHA-256
// hashes, 30-day expiry.

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;
const SESSION_TTL_DAYS = 30;

function hashCode(phone: string, code: string): string {
  return createHmac("sha256", env.appSecret)
    .update(`otp:${phone}:${code}`)
    .digest("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(`sess:${token}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ── SMS delivery (Termii-ready) ────────────────────────────────────
// Returns true when the code was actually dispatched. Without provider
// credentials we log and let the caller surface a devCode instead.
async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  if (!env.termiiApiKey) {
    log.info("OTP SMS skipped — no TERMII_API_KEY configured", { phone });
    return false;
  }
  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone.replace("+", ""),
        from: env.termiiSenderId,
        sms: `Your Purple Foods code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        type: "plain",
        channel: "generic",
        api_key: env.termiiApiKey,
      }),
    });
    if (!res.ok) {
      log.error("Termii SMS failed", { phone, status: res.status });
      return false;
    }
    return true;
  } catch (err) {
    log.error("Termii SMS error", {
      phone,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function requestOtp(rawPhone: string): Promise<RequestOtpResult> {
  const db = getDb();
  const phone = normalizePhone(rawPhone);

  // Rate limit: max OTP_MAX_PER_HOUR codes per phone per rolling hour.
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, since)));
  if (recent.length >= OTP_MAX_PER_HOUR) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many codes requested. Try again in about an hour.",
    });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({
    phone,
    codeHash: hashCode(phone, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  const sent = await sendOtpSms(phone, code);
  return {
    ok: true,
    ttlMinutes: OTP_TTL_MINUTES,
    ...(sent ? {} : { devCode: code }),
  };
}

export async function verifyOtp(
  rawPhone: string,
  rawCode: string,
): Promise<VerifyOtpResult> {
  const db = getDb();
  const phone = normalizePhone(rawPhone);
  const code = rawCode.replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter the 6-digit code.",
    });
  }

  const rows = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  const otp = rows[0];

  const invalid = new TRPCError({
    code: "UNAUTHORIZED",
    message: "That code is not right. Check it and try again.",
  });

  if (!otp || otp.expiresAt < new Date()) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Code expired — request a fresh one.",
    });
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many wrong attempts. Request a fresh code.",
    });
  }

  const matches = safeEqualHex(otp.codeHash, hashCode(phone, code));
  if (!matches) {
    await db
      .update(otpCodes)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(otpCodes.id, otp.id));
    throw invalid;
  }

  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodes.id, otp.id));

  // Find or create the customer by phone (phone is the identity key).
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  let user = userRows[0];
  if (!user) {
    const created = await db
      .insert(users)
      .values({ phone, role: "customer", lastSeenAt: new Date() })
      .returning();
    user = created[0]!;
  } else {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, user.id));
  }
  if (user.status !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This account is not active. Contact support.",
    });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    },
  };
}

export async function resolveSession(
  token: string,
): Promise<SessionUserDto | null> {
  const db = getDb();
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row || row.user.status !== "active") return null;

  // Touch last_used_at without blocking the request on it.
  db.update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, row.session.id))
    .catch(() => undefined);

  return {
    id: row.user.id,
    phone: row.user.phone,
    name: row.user.name,
    role: row.user.role,
  };
}

export async function revokeSession(token: string): Promise<void> {
  const db = getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashToken(token)));
}
