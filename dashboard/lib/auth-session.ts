import { cookies } from "next/headers";
import { ROLE_HOME, ROLE_PERMISSIONS, normalizeRole } from "./rbac";

export const AUTH_COOKIE_NAME = "carehomeos.auth";

export type AuthSession = {
  name: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  careHomeId?: string | null;
  careHomeName?: string | null;
  adminLevel?: string | null;
  platformScope?: string | null;
  idToken?: string;
  accessToken?: string;
  expiresAt: number;
};

type JwtPayload = {
  name?: string;
  email?: string;
  nickname?: string;
  permissions?: string[];
  exp?: number;
  [claim: string]: unknown;
};

const CLAIM_NAMESPACE = "https://carehomeos.local";

const DEMO_AUTH_USERS: Record<string, Partial<AuthSession>> = {
  "superadmin@carehomeos.local": {
    name: "Sofia Platform",
    role: "super_admin",
    roles: ["super_admin"],
    careHomeName: "CareHomeOS company",
    platformScope: "carehomeos_company",
  },
  "manager@oakfield.local": {
    name: "Ruth Manager",
    role: "care_home_admin",
    roles: ["care_home_admin"],
    careHomeId: "home-oakfield",
    careHomeName: "Oakfield House",
    adminLevel: "registered_manager",
  },
  "deputy@oakfield.local": {
    name: "Devon Deputy",
    role: "sub_admin",
    roles: ["sub_admin"],
    careHomeId: "home-oakfield",
    careHomeName: "Oakfield House",
    adminLevel: "assistant_manager",
  },
  "staff@oakfield.local": {
    name: "Amelia Williams",
    role: "staff",
    roles: ["staff"],
    careHomeId: "home-oakfield",
    careHomeName: "Oakfield House",
  },
};

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function parseJwtPayload(token?: string): JwtPayload {
  if (!token) {
    return {};
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(base64UrlDecode(payload)) as JwtPayload;
  } catch {
    return {};
  }
}

function readStringClaim(payload: JwtPayload, key: string) {
  const candidates = [
    payload[`${CLAIM_NAMESPACE}/${key}`],
    payload[`${CLAIM_NAMESPACE}/${key.replaceAll("_", "-")}`],
    payload[key],
  ];
  for (const value of candidates) {
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
}

function readStringArrayClaim(payload: JwtPayload, key: string) {
  const candidates = [
    payload[`${CLAIM_NAMESPACE}/${key}`],
    payload[`${CLAIM_NAMESPACE}/${key.replaceAll("_", "-")}`],
    payload[key],
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
  }
  return [];
}

export function sanitizeReturnTo(value: string | null, fallback = "/dashboard") {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "http://carehomeos.local");
    if (parsed.origin !== "http://carehomeos.local") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function getPublicOrigin(request: {
  headers: Headers;
  nextUrl: URL;
}) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");

  if (!host) {
    return request.nextUrl.origin;
  }

  if (protocol === "https") {
    try {
      const incoming = new URL(`${protocol}://${host}`);
      if (incoming.hostname === "carehomeos.localtest.me") {
        return "https://carehomeos.localtest.me";
      }
    } catch {
      return `${protocol}://${host}`;
    }
  }

  if (protocol === "https" && process.env.PUBLIC_DASHBOARD_URL) {
    try {
      const configured = new URL(process.env.PUBLIC_DASHBOARD_URL);
      const incoming = new URL(`${protocol}://${host}`);
      if (configured.protocol === "https:" && configured.hostname === incoming.hostname) {
        return configured.origin;
      }
    } catch {
      return `${protocol}://${host}`;
    }
  }

  return `${protocol}://${host}`;
}

export function isSecureRequest(request: {
  headers: Headers;
  nextUrl: URL;
}) {
  return getPublicOrigin(request).startsWith("https://");
}

export function createSessionFromTokens(tokens: {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
}): AuthSession {
  const idPayload = parseJwtPayload(tokens.id_token);
  const accessPayload = parseJwtPayload(tokens.access_token);
  const roles = [
    ...readStringArrayClaim(idPayload, "roles"),
    ...readStringArrayClaim(accessPayload, "roles"),
  ];
  const role = readStringClaim(idPayload, "role") || readStringClaim(accessPayload, "role") || roles[0] || "care_home_admin";
  const permissions = Array.isArray(accessPayload.permissions)
    ? accessPayload.permissions
    : readStringArrayClaim(accessPayload, "permissions");
  const expiresAt = Date.now() + Math.max(60, tokens.expires_in ?? 3600) * 1000;
  const email = idPayload.email || "";
  const demoUser = DEMO_AUTH_USERS[email.toLowerCase()];
  const resolvedRole = demoUser?.role || role;
  const resolvedRoles = demoUser?.roles || roles;
  const normalizedRole = normalizeRole({
    email,
    role: normalizedRole,
    roles: resolvedRoles,
    permissions,
    adminLevel: demoUser?.adminLevel || readStringClaim(idPayload, "admin_level") || readStringClaim(accessPayload, "admin_level"),
    platformScope: demoUser?.platformScope || readStringClaim(idPayload, "platform_scope") || readStringClaim(accessPayload, "platform_scope"),
  });
  const rolePermissions = normalizedRole === "signed_out" ? [] : ROLE_PERMISSIONS[normalizedRole];
  const inheritedPermissions = Array.from(new Set([
    ...permissions,
    ...rolePermissions,
  ]));

  return {
    name: demoUser?.name || idPayload.name || idPayload.nickname || idPayload.email || "CareHomeOS user",
    email,
    role: resolvedRole,
    roles: resolvedRoles.length > 0 ? resolvedRoles : [normalizedRole],
    permissions: inheritedPermissions,
    careHomeId: demoUser?.careHomeId || readStringClaim(idPayload, "care_home_id") || readStringClaim(accessPayload, "care_home_id"),
    careHomeName: demoUser?.careHomeName || readStringClaim(idPayload, "care_home_name") || readStringClaim(accessPayload, "care_home_name"),
    adminLevel: demoUser?.adminLevel || readStringClaim(idPayload, "admin_level") || readStringClaim(accessPayload, "admin_level"),
    platformScope: demoUser?.platformScope || readStringClaim(idPayload, "platform_scope") || readStringClaim(accessPayload, "platform_scope"),
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    expiresAt,
  };
}

export function createSessionSummary(session: AuthSession) {
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
  return Buffer.from(JSON.stringify(createSessionSummary(session)), "utf8").toString("base64url");
}

export function resolvePostLoginPath(session: Pick<AuthSession, "role" | "roles">, requestedPath: string) {
  const role = normalizeRole(session);
  if (role === "signed_out") {
    return "/login";
  }

  const roleHome = ROLE_HOME[role];
  if (requestedPath === roleHome || requestedPath.startsWith(`${roleHome}/`)) {
    return requestedPath;
  }

  if (role === "care_home_admin" || role === "sub_admin") {
    const careHomePaths = ["/dashboard", "/residents", "/staff", "/rota", "/mar", "/incidents", "/cqc"];
    if (careHomePaths.some((path) => requestedPath === path || requestedPath.startsWith(`${path}/`))) {
      return requestedPath;
    }
  }

  return roleHome;
}

export function encodeSession(session: AuthSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeSession(value?: string): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as AuthSession;
    if (!session.expiresAt || session.expiresAt < Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}
