import { NextResponse } from "next/server";

/** Lightweight check used by the login page to show Auth0 availability. */
export async function GET() {
  const configured = Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET,
  );

  return NextResponse.json({
    auth0Configured: configured,
    domain: process.env.AUTH0_DOMAIN ?? null,
    audience: process.env.AUTH0_AUDIENCE ?? null,
  });
}
