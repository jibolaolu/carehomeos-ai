"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ROLE_LABELS, hasAnyPermission, normalizeRole, type Permission, type RoleKey } from "../../lib/rbac";

type ShellUser = {
  name: string;
  email: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  careHomeName?: string | null;
  adminLevel?: string | null;
  platformScope?: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "D", roles: ["care_home_admin", "sub_admin"], permissions: ["read:dashboard"] },
  { href: "/residents", label: "Residents", icon: "R", permissions: ["manage:residents"] },
  { href: "/staff", label: "Staff", icon: "S", permissions: ["manage:staff"] },
  { href: "/rota", label: "Rota", icon: "T", permissions: ["manage:rota"] },
  { href: "/mar", label: "MAR", icon: "M", roles: ["care_home_admin", "sub_admin", "staff"], permissions: ["read:dashboard", "create:reports"] },
  { href: "/incidents", label: "Incidents", icon: "I", permissions: ["create:reports"] },
  { href: "/staff-reporting", label: "Reports", icon: "SR", roles: ["staff"], permissions: ["create:reports"] },
  { href: "/finance", label: "Finance", icon: "F", roles: ["care_home_admin"], permissions: ["manage:billing"] },
  { href: "/plans", label: "Plans", icon: "P", roles: ["care_home_admin", "super_admin"], permissions: ["manage:billing", "manage:platform"] },
  { href: "/admin/users", label: "Admins", icon: "A", roles: ["care_home_admin"], permissions: ["manage:staff"] },
  { href: "/platform-admin", label: "Company Admin", icon: "CA", roles: ["super_admin"], permissions: ["manage:platform"] },
  { href: "/cqc", label: "CQC", icon: "C", roles: ["care_home_admin", "sub_admin"], permissions: ["read:cqc"] },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: string; roles?: readonly RoleKey[]; permissions: readonly Permission[] }>;

function initials(user: ShellUser) {
  return (user.name || user.email || "CH")
    .split(/[ @.]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readCookieSummary() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("carehomeos.auth.summary="));
  if (!cookie) {
    return null;
  }

  try {
    const value = decodeURIComponent(cookie.split("=").slice(1).join("="));
    if (value.startsWith("{")) {
      return JSON.parse(value) as ShellUser;
    }
    return JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/"))) as ShellUser;
  } catch {
    return null;
  }
}

function hasSignedOutCookie() {
  return document.cookie.split("; ").some((row) => row === "carehomeos.signedout=1");
}

function canShowItem(item: (typeof navItems)[number], role: RoleKey, user: ShellUser | null) {
  if (role === "signed_out") {
    return false;
  }
  if ("roles" in item && item.roles && !item.roles.includes(role as never)) {
    return false;
  }
  return hasAnyPermission(user, item.permissions);
}

function isAllowedPath(pathname: string, role: RoleKey) {
  if (role === "signed_out") {
    return false;
  }

  const allowedStarts: Record<Exclude<RoleKey, "signed_out">, string[]> = {
    super_admin: ["/platform-admin", "/plans", "/sign-out"],
    care_home_admin: ["/dashboard", "/residents", "/staff", "/rota", "/mar", "/incidents", "/finance", "/plans", "/admin/users", "/cqc", "/sign-out"],
    sub_admin: ["/dashboard", "/residents", "/staff", "/rota", "/mar", "/incidents", "/cqc", "/sign-out"],
    staff: ["/staff-reporting", "/mar", "/sign-out"],
  };

  return allowedStarts[role].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function roleHomePath(role: RoleKey) {
  if (role === "super_admin") return "/platform-admin";
  if (role === "staff") return "/staff-reporting";
  return "/dashboard";
}

function backLabel(role: RoleKey) {
  if (role === "super_admin") return "Back to platform overview";
  if (role === "staff") return "Back to reporting";
  return "Back to dashboard";
}

export default function AppShell({ children, initialUser }: { children: ReactNode; initialUser?: ShellUser | null }) {
  const pathname = usePathname();
  const [user, setUser] = useState<ShellUser | null>(initialUser ?? null);
  const [authChecked, setAuthChecked] = useState(Boolean(initialUser));
  const publicPage = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/forgot-password") || pathname.startsWith("/sign-out");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);

    if (!publicPage && !initialUser) {
      setAuthChecked(false);
    }

    function acceptUser(candidate: ShellUser | null) {
      if (!candidate || cancelled) {
        return;
      }
      setUser(candidate);
      setAuthChecked(true);
    }

    if (hasSignedOutCookie()) {
      window.localStorage.removeItem("carehomeos.user");
      window.localStorage.removeItem("carehomeos.token");
      window.localStorage.removeItem("carehomeos.intendedRole");
      setUser(null);
      setAuthChecked(true);
      if (!publicPage) {
        window.location.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
      }
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
        controller.abort();
      };
    }

    const cookieUser = readCookieSummary();
    if (cookieUser) {
      acceptUser(cookieUser);
      window.localStorage.setItem("carehomeos.user", JSON.stringify(cookieUser));
    } else if (!initialUser) {
      const raw = window.localStorage.getItem("carehomeos.user");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ShellUser;
          acceptUser(parsed);
        } catch {
          window.localStorage.removeItem("carehomeos.user");
        }
      }
    }

    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.user) {
          acceptUser(payload.user);
          window.localStorage.setItem("carehomeos.user", JSON.stringify(payload.user));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) {
          setAuthChecked(true);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [initialUser, pathname, publicPage]);

  useEffect(() => {
    if (!publicPage && authChecked && !user) {
      window.location.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [authChecked, pathname, publicPage, user]);

  const shellUser = user ?? initialUser ?? null;
  const role = normalizeRole(shellUser);
  const visibleNav = useMemo(
    () => navItems.filter((item) => canShowItem(item, role, shellUser)),
    [role, shellUser],
  );

  useEffect(() => {
    if (publicPage || !authChecked || !shellUser || isAllowedPath(pathname, role)) {
      return;
    }

    window.location.replace(roleHomePath(role));
  }, [authChecked, pathname, publicPage, role, shellUser]);

  const roleHome = roleHomePath(role);
  const isHomeRoute = pathname === roleHome || pathname.startsWith(`${roleHome}/`);
  const homeName = shellUser?.careHomeName || (role === "super_admin" ? "CareHomeOS company" : "Oakfield House");
  const title = role === "super_admin" ? "Platform operations, subscriptions, and support" : "Operations, care quality, and compliance";
  const shellClassName = role === "super_admin" ? "shell platformShell" : "shell";

  return (
    <div className={shellClassName}>
      <aside className="sidebar">
        <div className="brandRow">
          <div className="brandMark">CH</div>
          <div>
            <p className="eyebrow">CareHomeOS</p>
            <h1>{shellUser ? ROLE_LABELS[role] : "CareHomeOS"}</h1>
          </div>
        </div>

        {visibleNav.length > 0 ? (
          <nav className="nav" aria-label="Role navigation">
            {visibleNav.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={active ? "navLink active" : "navLink"}>
                  <span className="navIcon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : !publicPage ? (
          <div className="sidebarMessage">
            <span className="badge">Checking session</span>
            <p className="muted">Loading your role navigation.</p>
          </div>
        ) : null}

        {shellUser ? (
          <div className="sidebarFooter">
            <p className="muted">{ROLE_LABELS[role]}</p>
            <strong>{homeName}</strong>
          </div>
        ) : null}
      </aside>

      <div className="appFrame">
        <header className="topbar">
          <div>
            <p className="eyebrow">{role === "super_admin" ? "CareHomeOS company" : "Nestiq Care Group"}</p>
            <strong>{shellUser ? title : "Loading your workspace"}</strong>
          </div>

          <div className="topbarActions">
            {!publicPage && shellUser && !isHomeRoute ? (
              <Link className="btn backButton" href={roleHome}>{backLabel(role)}</Link>
            ) : null}
            <button className="iconButton" aria-label="Notifications">
              <span className="dot" />
              N
            </button>
            {shellUser ? (
              <div className="userPill authUserPill">
                <span className="avatar">{initials(shellUser)}</span>
                <span>
                  <strong>{shellUser.name || "CareHomeOS user"}</strong>
                  <small>{ROLE_LABELS[role]}</small>
                </span>
                <Link className="btn primary signOutButton" href="/sign-out">Sign out</Link>
              </div>
            ) : !publicPage ? (
              <span className="badge">Checking session</span>
            ) : (
              <Link className="btn primary" href="/login">Sign in</Link>
            )}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

