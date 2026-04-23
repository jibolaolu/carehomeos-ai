export type RoleKey = "super_admin" | "care_home_admin" | "sub_admin" | "staff" | "signed_out";

export type Permission =
  | "read:dashboard"
  | "manage:residents"
  | "manage:staff"
  | "manage:rota"
  | "manage:billing"
  | "read:cqc"
  | "create:reports"
  | "manage:platform";

export type RbacUser = {
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  adminLevel?: string | null;
  careHomeId?: string | null;
  careHomeName?: string | null;
  platformScope?: string | null;
};

export const ROLE_PERMISSIONS: Record<Exclude<RoleKey, "signed_out">, Permission[]> = {
  super_admin: ["read:dashboard", "manage:platform", "manage:billing", "read:cqc"],
  care_home_admin: ["read:dashboard", "manage:residents", "manage:staff", "manage:rota", "manage:billing", "read:cqc", "create:reports"],
  sub_admin: ["read:dashboard", "manage:residents", "manage:staff", "manage:rota", "read:cqc", "create:reports"],
  staff: ["read:dashboard", "create:reports"],
};

export const ROLE_HOME: Record<Exclude<RoleKey, "signed_out">, string> = {
  super_admin: "/platform-admin",
  care_home_admin: "/dashboard",
  sub_admin: "/dashboard",
  staff: "/staff-reporting",
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "CareHomeOS company admin",
  care_home_admin: "Care home admin",
  sub_admin: "Assistant manager",
  staff: "Staff reporting",
  signed_out: "Signed out",
};

function roleToken(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeRole(user: RbacUser | null | undefined): RoleKey {
  if (!user) {
    return "signed_out";
  }

  const values = new Set([user.role ?? "", ...(user.roles ?? [])].map(roleToken).filter(Boolean));
  const adminLevel = roleToken(user.adminLevel);
  const platformScope = roleToken(user.platformScope);
  const permissions = new Set(user.permissions ?? []);
  const email = (user.email ?? "").toLowerCase();

  if (
    values.has("super_admin") ||
    values.has("superadmin") ||
    values.has("platform_admin") ||
    values.has("platform_administrator") ||
    values.has("carehomeos_admin") ||
    values.has("carehomeos_platform_admin") ||
    values.has("careos_platform_admin") ||
    values.has("care_home_os_platform_admin") ||
    values.has("company_admin") ||
    values.has("company_super_admin") ||
    platformScope.includes("platform") ||
    platformScope.includes("company") ||
    permissions.has("manage:platform") ||
    email.endsWith("@carehomeos.local")
  ) return "super_admin";

  if (
    values.has("staff") ||
    values.has("care_staff") ||
    values.has("carer") ||
    values.has("care_worker") ||
    values.has("reporting_staff")
  ) return "staff";

  if (
    values.has("sub_admin") ||
    values.has("subadmin") ||
    values.has("assistant_manager") ||
    values.has("deputy") ||
    values.has("deputy_admin") ||
    values.has("deputy_manager") ||
    values.has("assistant_admin") ||
    adminLevel === "assistant_manager" ||
    adminLevel === "deputy_manager" ||
    adminLevel === "deputy_admin"
  ) return "sub_admin";

  if (
    values.has("care_home_admin") ||
    values.has("carehome_admin") ||
    values.has("care_home_manager") ||
    values.has("registered_manager") ||
    values.has("manager") ||
    values.has("admin") ||
    adminLevel === "registered_manager" ||
    permissions.has("manage:billing")
  ) return "care_home_admin";

  if (permissions.has("manage:residents") || permissions.has("manage:rota") || permissions.has("manage:staff")) {
    return "sub_admin";
  }

  return "care_home_admin";
}

export function inheritedPermissions(user: RbacUser | null | undefined) {
  const role = normalizeRole(user);
  if (role === "signed_out") {
    return new Set<Permission>();
  }

  return new Set<Permission>([
    ...ROLE_PERMISSIONS[role],
    ...((user?.permissions ?? []).filter((permission): permission is Permission =>
      Object.values(ROLE_PERMISSIONS).some((permissions) => permissions.includes(permission as Permission)),
    )),
  ]);
}

export function hasAnyPermission(user: RbacUser | null | undefined, permissions: readonly Permission[]) {
  const inherited = inheritedPermissions(user);
  return permissions.some((permission) => inherited.has(permission));
}

export function resolveRoleHome(user: RbacUser | null | undefined) {
  const role = normalizeRole(user);
  return role === "signed_out" ? "/login" : ROLE_HOME[role];
}
