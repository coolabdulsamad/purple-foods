import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

// Purple Foods' source of truth is OUR Neon database. A deployed container may
// also receive a platform-injected DATABASE_URL (its own provisioned, empty
// database), and process env beats .env because dotenv never overrides — which
// would silently point every query at the foreign database and 500 the whole
// storefront. PF_DATABASE_URL (pinned in .env, which ships in the deploy zip)
// therefore always wins; DATABASE_URL is only a fallback for local dev.
function pickDatabaseUrl(): string {
  return (process.env.PF_DATABASE_URL ?? process.env.DATABASE_URL ?? "").trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

const databaseUrl = pickDatabaseUrl();

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  // Never `required()`: a missing/bad URL must degrade to /api/health "down"
  // and 500ing API calls while statics keep serving — not a boot crash-loop.
  databaseUrl,
  databaseHost: hostOf(databaseUrl),
  // SMS provider for OTP delivery (Termii). When absent, requestOtp returns
  // the code inline as devCode so sign-in stays testable.
  termiiApiKey: process.env.TERMII_API_KEY ?? "",
  termiiSenderId: process.env.TERMII_SENDER_ID ?? "PurpleFds",
  // Google Identity Services client id. When absent, auth.google answers
  // PRECONDITION_FAILED and the client keeps email/phone sign-in in front.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  // Facebook Login. auth.facebook verifies the user token with
  // debug_token (app_id|app_secret as the app access token). Absent →
  // PRECONDITION_FAILED so the client keeps the other methods in front.
  facebookAppId: process.env.FACEBOOK_APP_ID ?? "",
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? "",
  // Paystack secret key (server-side only). Absent → card checkout
  // answers PRECONDITION_FAILED and COD stays the working method.
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  paystackPublicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY ?? "",
  // Public base URL of the app, used for the Paystack callback. Falls
  // back to the request origin when unset.
  appBaseUrl: process.env.APP_BASE_URL ?? "",
};
