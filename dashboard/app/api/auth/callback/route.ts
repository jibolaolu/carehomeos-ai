import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionFromTokens, encodeSession, encodeSessionSummary, getPublicOrigin, isSecureRequest, resolvePostLoginPath, sanitizeReturnTo } from "../../../../lib/auth-session";

export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("state"));
  const redirectUrl = new URL(returnTo, request.nextUrl.origin);
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const publicOrigin = getPublicOrigin(request);

  if (error) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("auth0", error);
    redirectUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("auth0", "missing-code");
    redirectUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(redirectUrl);
  }

  if (!domain || !clientId || !clientSecret) {
    redirectUrl.searchParams.set("auth0", "not-configured");
    return NextResponse.redirect(redirectUrl);
  }

  const callbackUrl = new URL("/api/auth/callback", publicOrigin);

  try {
    const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl.toString(),
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("auth0", "token-exchange-failed");
      redirectUrl.searchParams.set("returnTo", returnTo);
      return NextResponse.redirect(redirectUrl);
    }

    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      id_token?: string;
      expires_in?: number;
    };
    const session = createSessionFromTokens(tokens);
    const destination = resolvePostLoginPath(session, returnTo);
    const response = NextResponse.redirect(new URL(destination, publicOrigin));
    response.cookies.set(AUTH_COOKIE_NAME, encodeSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      expires: new Date(session.expiresAt),
    });
    response.cookies.set("carehomeos.auth.summary", encodeSessionSummary(session), {
      httpOnly: false,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      expires: new Date(session.expiresAt),
    });
    response.cookies.set("carehomeos.signedout", "", {
      httpOnly: false,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
    return response;
  } catch {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("auth0", "callback-network-error");
    redirectUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(redirectUrl);
  }
}
