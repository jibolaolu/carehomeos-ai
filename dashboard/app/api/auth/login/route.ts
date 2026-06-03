import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin, sanitizeReturnTo } from "../../../../lib/auth-session";

export function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const audience = process.env.AUTH0_AUDIENCE;

  // eslint-disable-next-line no-console
  console.log("[auth/login] Auth0 config:", { domain: domain ?? "missing", clientId: clientId ? "present" : "missing", audience: audience ?? "missing" });

  if (!domain || !clientId) {
    // eslint-disable-next-line no-console
    console.log("[auth/login] Auth0 not configured, redirecting to login with not-configured");
    const loginUrl = new URL("/login", getPublicOrigin(request));
    loginUrl.searchParams.set("returnTo", returnTo);
    loginUrl.searchParams.set("auth0", "not-configured");
    return NextResponse.redirect(loginUrl);
  }

  const baseUrl = getPublicOrigin(request);
  const callbackUrl = new URL("/api/auth/callback", baseUrl);
  const authorizeUrl = new URL(`https://${domain}/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authorizeUrl.searchParams.set("scope", "openid profile email");
  authorizeUrl.searchParams.set("state", returnTo);
  authorizeUrl.searchParams.set("prompt", "login");
  if (audience) {
    authorizeUrl.searchParams.set("audience", audience);
  }

  // eslint-disable-next-line no-console
  console.log("[auth/login] redirecting to Auth0:", authorizeUrl.toString());
  return NextResponse.redirect(authorizeUrl);
}

