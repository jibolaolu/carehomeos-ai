/**
 * /api/auth/whoami — Edge-runtime session diagnostic.
 *
 * Decodes the auth cookie using EXACTLY the same logic as middleware.ts
 * (pure atob — no Buffer dependency) so you can instantly verify whether
 * the session is being set and decoded correctly.
 *
 * Visit this URL AFTER logging in:
 *   https://carehomeos.localtest.me/api/auth/whoami
 *   http://localhost:3105/api/auth/whoami
 *
 * This route is public (no auth required) — safe for local dev diagnostics.
 * It is also declared in middleware PUBLIC_PREFIXES via "/api/auth/" prefix.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const COOKIE_NAME = "carehomeos.auth";

type SessionCore = {
  name?: string;
  email?: string;
  role?: string;
  expiresAt?: number;
  careHomeId?: string | null;
  careHomeName?: string | null;
};

function decodeCore(raw: string | undefined): { ok: boolean; session: SessionCore | null; error?: string } {
  if (!raw) {
    return { ok: false, session: null, error: "cookie not present" };
  }
  try {
    const base64 = raw
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(raw.length / 4) * 4, "=");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const session = JSON.parse(json) as SessionCore;
    return { ok: true, session };
  } catch (err) {
    return { ok: false, session: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export function GET(request: NextRequest) {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  const { ok, session, error } = decodeCore(raw);

  const now = Date.now();
  const expired = session?.expiresAt ? session.expiresAt < now : null;
  const expiresInSeconds = session?.expiresAt ? Math.round((session.expiresAt - now) / 1000) : null;
  const sessionValid = ok && !expired && typeof session?.role === "string";

  return NextResponse.json({
    sessionValid,
    cookiePresent: Boolean(raw),
    cookieBytes: raw ? new TextEncoder().encode(raw).length : 0,
    decodeOk: ok,
    decodeError: error ?? null,
    session: session
      ? {
          name: session.name ?? null,
          email: session.email ?? null,
          role: session.role ?? null,
          careHomeId: session.careHomeId ?? null,
          careHomeName: session.careHomeName ?? null,
          expiresAt: session.expiresAt ?? null,
          expiresInSeconds,
          expired: expired ?? null,
        }
      : null,
    diagnostics: {
      runtime: "edge",
      cookiePreview: raw ? `${raw.slice(0, 32)}…` : null,
    },
  });
}
