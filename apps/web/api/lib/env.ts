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
};
