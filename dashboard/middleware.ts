import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/auth-types";
import { publicUrl } from "./lib/public-origin";
import { ROLE_HOME, ROLE_ROUTE_PREFIXES, type RoleKey } from "./lib/rbac";

// ---------------------------------------------------------------------------
// Middleware-local session decoder
// ---------------------------------------------------------------------------
// We deliberately do NOT import from lib/auth-cookie here.
// That module calls Buffer.from(value, "base64url") in its decode path, and
// Edge runtime's Buffer polyfill does NOT support the "base64url" encoding —
// it returns garbage silently, decodeAuthSession returns null, and every
// request gets bounced back to /login in a redirect loop.
//
// Instead we decode using only atob + TextDecoder — pure Web APIs that are
// natively available in every Edge runtime and need no polyfill.
// ---------------------------------------------------------------------------

type SessionCore = {
  role?: string;
  expiresAt?: number;
};

function decodeSessionCore(raw: string | undefined): SessionCore | null {
  if (!raw) return null;
  try {
    // base64url → standard base64 (pad to multiple of 4)
    const base64 = raw
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(raw.length / 4) * 4, "=");

    // atob is natively available in Edge runtime (no Buffer polyfill needed)
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as SessionCore;
  } catch {
    return null;
  }
}

function isSessionValid(session: SessionCore | null): session is SessionCore & { role: string; expiresAt: number } {
  return (
    session !== null &&
    typeof session.role === "string" &&
    typeof session.expiresAt === "number" &&
    session.expiresAt > Date.now()
  );
}

// ---------------------------------------------------------------------------
// Role routing helpers (mirrors lib/rbac without imports that could pull in
// Buffer-using modules transitively)
// ---------------------------------------------------------------------------

const VALID_ROLES = new Set<RoleKey>([
  "super_admin",
  "care_home_admin",
  "sub_admin",
  "staff",
]);

function toRoleKey(raw: string): RoleKey {
  return VALID_ROLES.has(raw as RoleKey) ? (raw as RoleKey) : "care_home_admin";
}

function roleHomePath(role: RoleKey): string {
  if (role === "signed_out") return "/login";
  return ROLE_HOME[role];
}

function isPathAllowedForRole(pathname: string, role: RoleKey): boolean {
  if (role === "signed_out") return false;
  const prefixes = ROLE_ROUTE_PREFIXES[role];
  return prefixes.some(
    (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// ---------------------------------------------------------------------------
// Public paths — never require authentication
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = new Set(["/", "/login", "/forgot-password", "/sign-out"]);
const PUBLIC_PREFIXES = ["/api/auth/", "/_next/", "/favicon.ico"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Middleware entry point
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /login is always reachable so users can switch roles by clicking a chip.
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = decodeSessionCore(raw);

  // eslint-disable-next-line no-console
  console.log("[middleware] pathname:", pathname, "cookie present:", Boolean(raw), "session valid:", isSessionValid(session));

  if (!isSessionValid(session)) {
    // No valid session — send to login with the original path as returnTo.
    return NextResponse.redirect(
      publicUrl(request, "/login", { returnTo: pathname }),
    );
  }

  const role = toRoleKey(session.role);

  // eslint-disable-next-line no-console
  console.log("[middleware] role:", role, "path allowed:", isPathAllowedForRole(pathname, role));

  if (!isPathAllowedForRole(pathname, role)) {
    // Valid session but wrong role for this path — send to role home.
    return NextResponse.redirect(publicUrl(request, roleHomePath(role)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
