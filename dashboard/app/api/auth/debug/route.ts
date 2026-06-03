import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "../../../../lib/auth-types";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME);
  const summaryCookie = request.cookies.get("carehomeos.auth.summary");

  return NextResponse.json({
    cookies: {
      [AUTH_COOKIE_NAME]: cookie ? { present: true, length: cookie.value.length } : { present: false },
      "carehomeos.auth.summary": summaryCookie ? { present: true, length: summaryCookie.value.length } : { present: false },
    },
    headers: {
      host: request.headers.get("host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
    },
    url: request.url,
  });
}
