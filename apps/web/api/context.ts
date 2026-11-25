import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { SessionUserDto } from "@contracts/types";
import { resolveSession } from "./queries/auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  /** Raw bearer token from the Authorization header, if any. */
  sessionToken: string | null;
  /** Resolved session user, when the token is valid. */
  user: SessionUserDto | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const header = opts.req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const sessionToken = match?.[1]?.trim() || null;

  let user: SessionUserDto | null = null;
  if (sessionToken) {
    try {
      user = await resolveSession(sessionToken);
    } catch {
      // A session lookup failure must never take down a public request;
      // treat it as signed out. The error still surfaces in server logs
      // via the caller's own instrumentation if it persists.
      user = null;
    }
  }

  return { req: opts.req, resHeaders: opts.resHeaders, sessionToken, user };
}
