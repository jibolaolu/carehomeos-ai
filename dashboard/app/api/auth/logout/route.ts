import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isSecureRequest } from "../../../../lib/auth-session";
import { publicUrl } from "../../../../lib/public-origin";

function logoutResponse(request: NextRequest) {
  // returnTo must match one of the origins in Auth0's Allowed Logout URLs list.
  // Use the root path "/" so it matches "https://carehomeos.localtest.me" and
  // "http://localhost:3105" exactly — paths like "/login" are rejected by Auth0.
  const returnTo = publicUrl(request, "/");
  const secure = isSecureRequest(request);

  // If Auth0 is configured, send the browser through Auth0's logout endpoint
  // so the Auth0 SSO session is also terminated. Auth0 will redirect back to
  // `returnTo` after clearing its own session — the Set-Cookie headers below
  // are applied by the browser before it follows the redirect chain.
  const auth0Domain = process.env.AUTH0_DOMAIN;
  const auth0ClientId = process.env.AUTH0_CLIENT_ID;
  let redirectTarget: URL = returnTo;
  if (auth0Domain && auth0ClientId) {
    const auth0Logout = new URL(`https://${auth0Domain}/v2/logout`);
    auth0Logout.searchParams.set("client_id", auth0ClientId);
    auth0Logout.searchParams.set("returnTo", returnTo.toString());
    redirectTarget = auth0Logout;
  }

  const response = NextResponse.redirect(redirectTarget, 303);
  const cookieBase = { sameSite: "lax" as const, path: "/" };

  for (const useSecure of [secure, false]) {
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      ...cookieBase,
      httpOnly: true,
      secure: useSecure,
      expires: new Date(0),
      maxAge: 0,
    });
    response.cookies.set("carehomeos.auth.summary", "", {
      ...cookieBase,
      httpOnly: false,
      secure: useSecure,
      expires: new Date(0),
      maxAge: 0,
    });
  }

  return response;
}

export function GET(request: NextRequest) {
  return logoutResponse(request);
}

export function POST(request: NextRequest) {
  return logoutResponse(request);
}
