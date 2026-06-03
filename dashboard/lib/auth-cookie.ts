import type { AuthSession, AuthSessionSummary } from "./auth-types";

/** Encode session JSON as base64url (Node + Edge safe). */
export function encodeAuthPayload(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") {
    // Node runtime: Buffer natively supports base64url output.
    return Buffer.from(json, "utf8").toString("base64url");
  }
  // Edge runtime fallback (rare — Edge has Buffer polyfill, but just in case).
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decode base64url session payload — safe in both Node and Edge runtimes.
 *
 * IMPORTANT: do NOT use `Buffer.from(value, "base64url")` here.
 * Edge runtime's Buffer polyfill only supports "base64" (standard), not
 * "base64url", so that call silently returns garbage or throws, making
 * every cookie decode return null and sending the middleware into a
 * redirect loop back to /login.
 *
 * Instead we manually strip the URL-safe chars (- → +, _ → /), pad to
 * a multiple of 4, then decode with standard "base64" — universally
 * supported in both runtimes.
 */
export function decodeAuthPayload<T = AuthSession>(value: string): T | null {
  if (!value) {
    return null;
  }

  try {
    // base64url → standard base64 (with padding)
    const base64 = value
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");

    let bytes: Uint8Array;
    if (typeof Buffer !== "undefined") {
      // Node (and Edge polyfill) — "base64" is always supported.
      bytes = Buffer.from(base64, "base64");
    } else {
      // Pure Edge runtime without Buffer polyfill.
      const binary = atob(base64);
      bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    }

    // Use TextDecoder for correct UTF-8 handling (names, emails with accents).
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function decodeAuthSession(value?: string | null): AuthSession | null {
  const session = decodeAuthPayload<AuthSession>(value ?? "");
  if (!session?.expiresAt || session.expiresAt < Date.now()) {
    return null;
  }
  return session;
}

export function createSessionSummary(session: AuthSession): AuthSessionSummary {
  return {
    name: session.name,
    email: session.email,
    role: session.role,
    roles: session.roles,
    permissions: session.permissions,
    careHomeId: session.careHomeId,
    careHomeName: session.careHomeName,
    adminLevel: session.adminLevel,
    platformScope: session.platformScope,
  };
}

export function encodeSessionSummary(session: AuthSession) {
  return encodeAuthPayload(createSessionSummary(session));
}

export function decodeSessionSummary(value: string) {
  return decodeAuthPayload<AuthSessionSummary>(value);
}

export function encodeSession(session: AuthSession) {
  return encodeAuthPayload(session);
}

export function decodeSession(value?: string): AuthSession | null {
  return decodeAuthSession(value);
}
