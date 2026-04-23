import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getPublicOrigin, isSecureRequest } from "../../../../lib/auth-session";

function getLogoutOrigin(request: NextRequest) {
  const configuredOrigin =
    process.env.PUBLIC_DASHBOARD_URL ||
    process.env.AUTH0_BASE_URL ||
    process.env.NEXT_PUBLIC_DASHBOARD_URL;

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // Fall through to the request-derived origin below.
    }
  }

  const publicOrigin = getPublicOrigin(request);
  try {
    const parsed = new URL(publicOrigin);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return "https://carehomeos.localtest.me";
    }
    return parsed.origin;
  } catch {
    return "https://carehomeos.localtest.me";
  }
}

function logoutResponse(request: NextRequest) {
  const returnTo = new URL("/", getLogoutOrigin(request));
  const secure = isSecureRequest(request) || returnTo.protocol === "https:";

  const response = NextResponse.redirect(returnTo, 303);
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  response.cookies.set("carehomeos.auth.summary", "", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  response.cookies.set("carehomeos.signedout", "1", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 300,
  });
  return response;
}

export function GET(request: NextRequest) {
  return logoutResponse(request);
}

export function POST(request: NextRequest) {
  return logoutResponse(request);
}
