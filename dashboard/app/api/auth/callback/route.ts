import { NextRequest, NextResponse } from "next/server";
import {
  createSessionFromTokens,
  getPublicOrigin,
  resolvePostLoginPath,
  sanitizeReturnTo,
} from "../../../../lib/auth-session";
import { publicUrl } from "../../../../lib/public-origin";
import { applyAuthCookies } from "../../../../lib/set-auth-cookies";

function loginRedirect(
  request: NextRequest,
  returnTo: string,
  auth0Code: string,
  auth0Desc?: string,
) {
  const url = publicUrl(request, "/login", {
    returnTo,
    auth0: auth0Code,
    ...(auth0Desc ? { auth0_desc: auth0Desc } : {}),
  });
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("state"));
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description") ?? undefined;
  const code = request.nextUrl.searchParams.get("code");
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const publicOrigin = getPublicOrigin(request);

  // eslint-disable-next-line no-console
  console.log("[auth/callback] received callback:", { error, code: code ? "present" : "missing", returnTo, domain, clientId: clientId ? "present" : "missing", clientSecret: clientSecret ? "present" : "missing" });

  if (error) {
    // eslint-disable-next-line no-console
    console.log("[auth/callback] Auth0 returned error:", error, errorDescription);
    return loginRedirect(request, returnTo, error, errorDescription);
  }

  if (!code) {
    return loginRedirect(request, returnTo, "missing-code");
  }

  if (!domain || !clientId || !clientSecret) {
    return loginRedirect(
      request,
      returnTo,
      "not-configured",
      "AUTH0_DOMAIN, AUTH0_CLIENT_ID, or AUTH0_CLIENT_SECRET is missing from the dashboard environment.",
    );
  }

  const callbackUrl = new URL("/api/auth/callback", publicOrigin);
  // eslint-disable-next-line no-console
  console.log("[auth/callback] exchanging code for tokens at:", `https://${domain}/oauth/token`, "redirect_uri:", callbackUrl.toString());

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

    const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as {
      access_token?: string;
      id_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    // eslint-disable-next-line no-console
    console.log("[auth/callback] token response:", { status: tokenResponse.status, ok: tokenResponse.ok, error: tokenPayload.error, hasAccessToken: !!tokenPayload.access_token, hasIdToken: !!tokenPayload.id_token });

    if (!tokenResponse.ok) {
      return loginRedirect(
        request,
        returnTo,
        tokenPayload.error ?? "token-exchange-failed",
        tokenPayload.error_description ?? `Auth0 returned HTTP ${tokenResponse.status}.`,
      );
    }

    const session = createSessionFromTokens(tokenPayload);
    // eslint-disable-next-line no-console
    console.log("[auth/callback] session created:", { email: session.email, role: session.role, name: session.name });

    const destination = resolvePostLoginPath(session, returnTo);
    // eslint-disable-next-line no-console
    console.log("[auth/callback] redirecting to:", destination);

    const response = NextResponse.redirect(new URL(destination, publicOrigin));
    applyAuthCookies(response, request, session);
    return response;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth/callback] network error:", err);
    return loginRedirect(request, returnTo, "callback-network-error");
  }
}
