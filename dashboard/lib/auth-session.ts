import { cookies } from "next/headers";
import { decodeAuthSession, decodeSession } from "./auth-cookie";
import { AUTH_COOKIE_NAME, type AuthSession } from "./auth-types";
import { getPublicOrigin, isSecureRequest } from "./public-origin";
import { ROLE_HOME, ROLE_PERMISSIONS, isPathAllowedForRole, normalizeRole } from "./rbac";

export { getPublicOrigin, isSecureRequest, LOCAL_DASHBOARD_ORIGIN, publicUrl } from "./public-origin";

export { AUTH_COOKIE_NAME, type AuthSession } from "./auth-types";
export {
  createSessionSummary,
  decodeSessionSummary,
  encodeSessionSummary,
  encodeSession,
  decodeSession,
} from "./auth-cookie";

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
  // CQC Assistant demo accounts (also used when logging in via Auth0)
  "manager@demo.com": {
    name: "Demo Manager",
    role: "care_home_admin",
    roles: ["care_home_admin"],
    careHomeId: "home-demo",
    careHomeName: "Demo Care Home Ltd",
    adminLevel: "registered_manager",
  },
  "admin@demo.com": {
    name: "Demo Admin",
    role: "super_admin",
    roles: ["super_admin"],
    careHomeName: "CQC Assistant Platform",
    platformScope: "carehomeos_company",
  },
  "staff@demo.com": {
    name: "Demo Staff",
    role: "staff",
    roles: ["staff"],
    careHomeId: "home-demo",
    careHomeName: "Demo Care Home Ltd",
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
    role: resolvedRole,
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
    role: normalizedRole,
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

export function resolvePostLoginPath(
  session: Pick<AuthSession, "email" | "role" | "roles" | "permissions" | "adminLevel" | "platformScope">,
  requestedPath: string,
) {
  const role = normalizeRole(session);
  if (role === "signed_out") {
    return "/login";
  }

  const roleHome = ROLE_HOME[role];
  if (requestedPath === roleHome || requestedPath.startsWith(`${roleHome}/`)) {
    return requestedPath;
  }

  if (isPathAllowedForRole(requestedPath, role)) {
    return requestedPath;
  }

  return roleHome;
}

export function buildAuthSession(input: {
  name: string;
  email: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  careHomeId?: string | null;
  careHomeName?: string | null;
  adminLevel?: string | null;
  platformScope?: string | null;
  idToken?: string;
  accessToken?: string;
  expiresAt?: number;
}): AuthSession {
  const expiresAt = input.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000;
  const candidate = {
    email: input.email,
    role: input.role,
    roles: input.roles,
    permissions: input.permissions,
    adminLevel: input.adminLevel,
    platformScope: input.platformScope,
  };
  const role = normalizeRole(candidate);
  const rolePermissions = role === "signed_out" ? [] : ROLE_PERMISSIONS[role];
  const permissions = Array.from(new Set([...(input.permissions ?? []), ...rolePermissions]));

  return {
    name: input.name,
    email: input.email,
    role,
    roles: input.roles?.length ? input.roles : [role],
    permissions,
    careHomeId: input.careHomeId ?? null,
    careHomeName: input.careHomeName ?? null,
    adminLevel: input.adminLevel ?? null,
    platformScope: input.platformScope ?? null,
    idToken: input.idToken,
    accessToken: input.accessToken,
    expiresAt,
  };
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}


