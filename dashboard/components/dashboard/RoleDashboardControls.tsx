"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasAnyPermission, normalizeRole, type Permission, type RoleKey } from "../../lib/rbac";

type DashboardUser = {
  email?: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  adminLevel?: string | null;
  platformScope?: string | null;
};

type Action = {
  href: string;
  label: string;
  primary?: boolean;
  permissions: Permission[];
  roles?: Exclude<RoleKey, "signed_out">[];
};

const actions: Action[] = [
  { href: "/platform-admin", label: "Platform admin", primary: true, roles: ["super_admin"], permissions: ["manage:platform"] },
  { href: "/plans", label: "Plans", roles: ["care_home_admin", "super_admin"], permissions: ["manage:billing"] },
  { href: "/admin/users", label: "Create admin", roles: ["care_home_admin"], permissions: ["manage:staff"] },
  { href: "/staff", label: "Add staff", permissions: ["manage:staff"] },
  { href: "/finance", label: "Finance", roles: ["care_home_admin"], permissions: ["manage:billing"] },
  { href: "/rota", label: "Manage rota", primary: true, permissions: ["manage:rota"] },
  { href: "/residents", label: "Resident reviews", permissions: ["manage:residents"] },
  { href: "/cqc", label: "CQC evidence", primary: true, permissions: ["read:cqc"] },
  { href: "/staff-reporting", label: "Create report", primary: true, roles: ["staff"], permissions: ["create:reports"] },
  { href: "/incidents", label: "Incidents", permissions: ["create:reports"] },
];

function readCookieSummary() {
  const row = document.cookie.split("; ").find((item) => item.startsWith("carehomeos.auth.summary="));
  if (!row) return null;

  try {
    const value = decodeURIComponent(row.split("=").slice(1).join("="));
    if (value.startsWith("{")) {
      return JSON.parse(value) as DashboardUser;
    }
    return JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/"))) as DashboardUser;
  } catch {
    return null;
  }
}

export default function RoleDashboardControls({ initialUser }: { initialUser?: DashboardUser | null }) {
  const [user, setUser] = useState<DashboardUser | null>(initialUser ?? null);
  const [authChecked, setAuthChecked] = useState(Boolean(initialUser));

  useEffect(() => {
    const cookieUser = readCookieSummary();
    if (cookieUser) {
      setUser(cookieUser);
      window.localStorage.setItem("carehomeos.user", JSON.stringify(cookieUser));
    } else if (!initialUser) {
      const raw = window.localStorage.getItem("carehomeos.user");
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          window.localStorage.removeItem("carehomeos.user");
        }
      }
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.user) {
          setUser(payload.user);
        }
      })
      .catch(() => undefined)
      .finally(() => setAuthChecked(true));
  }, [initialUser]);

  const role = normalizeRole(user);
  const visibleActions = actions.filter((action) => {
    if (action.roles && !action.roles.includes(role as Exclude<RoleKey, "signed_out">)) {
      return false;
    }
    return hasAnyPermission(user, action.permissions);
  });

  if (user && visibleActions.length > 0) {
    return (
      <div className="roleControlStack">
        <span className={role === "sub_admin" ? "badge warning" : role === "care_home_admin" ? "badge success" : "badge"}>{role.replaceAll("_", " ")}</span>
        <div className="actions">
          {visibleActions.slice(0, 4).map((action) => (
            <Link key={action.href + action.label} href={action.href} className={action.primary ? "btn primary" : "btn"}>{action.label}</Link>
          ))}
        </div>
      </div>
    );
  }

  return authChecked ? null : <div className="roleControlStack"><span className="badge">Checking session</span></div>;
}
