import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  // SMS provider for OTP delivery (Termii). When absent, requestOtp returns
  // the code inline as devCode so sign-in stays testable.
  termiiApiKey: process.env.TERMII_API_KEY ?? "",
  termiiSenderId: process.env.TERMII_SENDER_ID ?? "PurpleFds",
  // Google Identity Services client id. When absent, auth.google answers
  // PRECONDITION_FAILED and the client keeps email/phone sign-in in front.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
};
