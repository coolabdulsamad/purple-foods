import { createHash, createHmac, randomInt, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import type {
  AuthResult,
  RequestOtpResult,
  SessionUserDto,
} from "@contracts/types";
import { notifications, otpCodes, sessions, users } from "@db/schema";
import { env } from "../lib/env";
import { log } from "../lib/logger";
import { getDb } from "./connection";
import { normalizePhone } from "./orders";

// ── Auth: phone OTP · email+password · Google ──────────────────────
// 6-digit codes, HMAC-SHA256 hashed with APP_SECRET (never stored in
// clear), 10-minute TTL, 5 verify attempts, 5 requests per phone per
// hour. Passwords are scrypt hashes with per-user salt. Sessions are
// opaque 256-bit bearer tokens stored as SHA-256 hashes, 30-day expiry.

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

// ── Shared session + user helpers ──────────────────────────────────

type UserRow = typeof users.$inferSelect;

function toSessionUser(user: UserRow): SessionUserDto {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

async function createSessionFor(user: UserRow): Promise<AuthResult> {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt: expiresAt.toISOString(), user: toSessionUser(user) };
}

function assertActive(user: UserRow): void {
  if (user.status !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This account is not active. Contact support.",
    });
  }
}

/** First-run inbox message so the Notifications page is never empty. */
async function sendWelcomeNotification(userId: string): Promise<void> {
  const db = getDb();
  await db.insert(notifications).values({
    userId,
    kind: "promo",
    title: "Welcome to Purple Foods",
    body: "Free delivery on your first order — applied automatically at checkout while the launch window lasts.",
  });
}

// ── Passwords (scrypt, per-user salt) ──────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const hash = scryptSync(password, parts[1]!, 64).toString("hex");
  return safeEqualHex(hash, parts[2]!);
}

function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter a valid email address.",
    });
  }
  return email;
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
): Promise<AuthResult> {
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
    await sendWelcomeNotification(user.id);
  } else {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, user.id));
  }
  assertActive(user);

  return createSessionFor(user);
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

  return toSessionUser(row.user);
}

export async function revokeSession(token: string): Promise<void> {
  const db = getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashToken(token)));
}

// ── Email + password ───────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export async function registerWithEmail(
  input: RegisterInput,
): Promise<AuthResult> {
  const db = getDb();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tell us your name.",
    });
  }
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (input.password.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Password must be at least 8 characters.",
    });
  }

  const [byEmail] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (byEmail) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An account with this email already exists — sign in instead.",
    });
  }

  const passwordHash = hashPassword(input.password);

  // A phone-only account from guest checkout or OTP gets upgraded in
  // place — order history stays attached to the same customer.
  const [byPhone] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  let user: UserRow;
  if (byPhone && !byPhone.passwordHash && !byPhone.email) {
    const updated = await db
      .update(users)
      .set({
        name,
        email,
        passwordHash,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, byPhone.id))
      .returning();
    user = updated[0]!;
  } else if (byPhone) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This phone number belongs to another account.",
    });
  } else {
    const created = await db
      .insert(users)
      .values({ name, email, phone, passwordHash, role: "customer", lastSeenAt: new Date() })
      .returning();
    user = created[0]!;
    await sendWelcomeNotification(user.id);
  }
  assertActive(user);
  return createSessionFor(user);
}

export async function loginWithEmail(
  rawEmail: string,
  password: string,
): Promise<AuthResult> {
  const db = getDb();
  const email = normalizeEmail(rawEmail);
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  // Verify against a dummy hash when the account is unknown so the
  // timing answer doesn't reveal which emails exist.
  const stored = user?.passwordHash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
  if (!user?.passwordHash || !verifyPassword(password, stored)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Email or password is not right. Try again.",
    });
  }
  assertActive(user);
  await db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, user.id));
  return createSessionFor(user);
}

// ── Google sign-in ─────────────────────────────────────────────────
// The client completes Google Identity Services and posts the ID token;
// we verify it with Google's tokeninfo endpoint and match the audience
// to GOOGLE_CLIENT_ID before trusting any claim.

interface GoogleClaims {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  aud: string;
  email_verified: string;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  if (!env.googleClientId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Google sign-in is being connected — use email or your phone number for now.",
    });
  }

  let claims: GoogleClaims;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) throw new Error(`tokeninfo ${res.status}`);
    claims = (await res.json()) as GoogleClaims;
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Google sign-in failed — try again.",
    });
  }
  if (claims.aud !== env.googleClientId || claims.email_verified !== "true") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Google sign-in failed verification.",
    });
  }

  const db = getDb();
  const email = claims.email.toLowerCase();

  const [bySub] = await db
    .select()
    .from(users)
    .where(eq(users.googleSub, claims.sub))
    .limit(1);
  let user = bySub;

  if (!user) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    if (byEmail) {
      // Link the Google identity to the existing email account.
      const updated = await db
        .update(users)
        .set({
          googleSub: claims.sub,
          avatarUrl: claims.picture ?? byEmail.avatarUrl,
          name: byEmail.name ?? claims.name ?? null,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, byEmail.id))
        .returning();
      user = updated[0]!;
    } else {
      const created = await db
        .insert(users)
        .values({
          email,
          name: claims.name ?? null,
          googleSub: claims.sub,
          avatarUrl: claims.picture ?? null,
          role: "customer",
          lastSeenAt: new Date(),
        })
        .returning();
      user = created[0]!;
      await sendWelcomeNotification(user.id);
    }
  } else {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, user.id));
  }

  assertActive(user);
  return createSessionFor(user);
}

// ── Facebook sign-in ───────────────────────────────────────────────
// The client completes Facebook Login (JS SDK) and posts the user
// access token; we validate it with debug_token (app access token =
// app_id|app_secret) before trusting /me claims.

interface FacebookDebugData {
  data?: { app_id?: string; is_valid?: boolean };
}

interface FacebookProfile {
  id: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

export async function loginWithFacebook(
  accessToken: string,
): Promise<AuthResult> {
  if (!env.facebookAppId || !env.facebookAppSecret) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Facebook sign-in is being connected — use Google, email or your phone number for now.",
    });
  }

  const appToken = `${env.facebookAppId}|${env.facebookAppSecret}`;
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`,
    );
    const debug = (await debugRes.json()) as FacebookDebugData;
    if (!debugRes.ok || !debug.data?.is_valid || debug.data.app_id !== env.facebookAppId) {
      throw new Error("invalid token");
    }
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Facebook sign-in failed verification — try again.",
    });
  }

  let profile: FacebookProfile;
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!meRes.ok) throw new Error(`graph ${meRes.status}`);
    profile = (await meRes.json()) as FacebookProfile;
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Could not read your Facebook profile — try again.",
    });
  }
  if (!profile.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Facebook sign-in failed — try again.",
    });
  }

  const db = getDb();
  const email = profile.email?.toLowerCase() ?? null;
  const picture = profile.picture?.data?.url ?? null;

  const [byFb] = await db
    .select()
    .from(users)
    .where(eq(users.facebookId, profile.id))
    .limit(1);
  let user = byFb;

  if (!user && email) {
    // Link Facebook to an existing email account.
    const [byEmail] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    if (byEmail) {
      const updated = await db
        .update(users)
        .set({
          facebookId: profile.id,
          avatarUrl: byEmail.avatarUrl ?? picture,
          name: byEmail.name ?? profile.name ?? null,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, byEmail.id))
        .returning();
      user = updated[0]!;
    }
  }

  if (!user) {
    const created = await db
      .insert(users)
      .values({
        email,
        name: profile.name ?? null,
        facebookId: profile.id,
        avatarUrl: picture,
        role: "customer",
        lastSeenAt: new Date(),
      })
      .returning();
    user = created[0]!;
    await sendWelcomeNotification(user.id);
  } else {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, user.id));
  }

  assertActive(user);
  return createSessionFor(user);
}

// ── Profile ────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  input: { name?: string; phone?: string },
): Promise<SessionUserDto> {
  const db = getDb();
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Tell us your name." });
    }
    patch.name = name;
  }
  if (input.phone !== undefined) {
    patch.phone = normalizePhone(input.phone);
  }
  let updated: UserRow[];
  try {
    updated = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, userId))
      .returning();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("users_phone_unique")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This phone number belongs to another account.",
      });
    }
    throw err;
  }
  if (!updated[0]) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
  }
  return toSessionUser(updated[0]);
}
