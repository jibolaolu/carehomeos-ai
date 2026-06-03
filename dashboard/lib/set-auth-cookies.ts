import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { encodeAuthPayload, encodeSessionSummary } from "./auth-cookie";
import { isSecureRequest } from "./public-origin";
import { AUTH_COOKIE_NAME, type AuthSession } from "./auth-types";

/** Attach auth session cookies to a Next.js response (HTTPS-proxy safe). */
export function applyAuthCookies(
  response: NextResponse,
  request: Pick<NextRequest, "headers" | "nextUrl">,
  session: AuthSession,
) {
  const secure = isSecureRequest(request);
  const expires = new Date(session.expiresAt);
  const cookieBase = { sameSite: "lax" as const, path: "/" };

  // Strip raw JWT tokens before encoding — they are not needed after authentication
  // and can push the cookie over the 4 KB browser limit (silently truncating it),
  // which makes the middleware decode fail and produces a redirect loop.
  const { name, email, role, roles, permissions, careHomeId, careHomeName, adminLevel, platformScope, expiresAt } = session;
  const cookieSession = { name, email, role, roles, permissions, careHomeId, careHomeName, adminLevel, platformScope, expiresAt };
  response.cookies.set(AUTH_COOKIE_NAME, encodeAuthPayload(cookieSession), {
    ...cookieBase,
    httpOnly: true,
    secure,
    expires,
  });
  response.cookies.set("carehomeos.auth.summary", encodeSessionSummary(session), {
    ...cookieBase,
    httpOnly: false,
    secure,
    expires,
  });
}
