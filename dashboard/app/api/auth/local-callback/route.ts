import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthSession,
  getPublicOrigin,
  resolvePostLoginPath,
  sanitizeReturnTo,
} from "../../../../lib/auth-session";
import type { AuthSession } from "../../../../lib/auth-types";
import { applyAuthCookies } from "../../../../lib/set-auth-cookies";
import { getApiBase } from "../../../../lib/api-base";

/**
 * Attempt the backend fetch up to `maxAttempts` times.
 * The backend may be briefly unavailable while uvicorn's WatchFiles reloader
 * is restarting (e.g. after a code change). A quick retry avoids surfacing
 * a transient "Network error" to the user.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts = 3,
  retryDelayMs = 600,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Hardcoded demo users — used as a fallback when the backend is unreachable.
 * Keeps development smooth even when uvicorn is not running.
 * Passwords are not secrets (dev-only, no production data).
 *
 * These match the users created by scripts/setup-auth0.js so local dev
 * works without an Auth0 account.
 */
const LOCAL_DEMO_USERS: Record<string, {
  id: string; name: string; role: string; roles: string[];
  careHomeId?: string; careHomeName?: string;
  adminLevel?: string; platformScope?: string;
  password: string;
}> = {
  "superadmin@carehomeos.local": {
    id: "usr-super-001", name: "Sofia Platform",
    role: "super_admin", roles: ["super_admin"],
    careHomeName: "CareHomeOS company", platformScope: "carehomeos_company",
    password: "CareHomeOS!2026",
  },
  "manager@oakfield.local": {
    id: "usr-admin-001", name: "Ruth Manager",
    role: "care_home_admin", roles: ["care_home_admin"],
    careHomeId: "home-oakfield", careHomeName: "Oakfield House",
    adminLevel: "registered_manager",
    password: "CareHomeOS!2026",
  },
  "deputy@oakfield.local": {
    id: "usr-admin-002", name: "Devon Deputy",
    role: "sub_admin", roles: ["sub_admin"],
    careHomeId: "home-oakfield", careHomeName: "Oakfield House",
    adminLevel: "assistant_manager",
    password: "CareHomeOS!2026",
  },
  "staff@oakfield.local": {
    id: "usr-staff-001", name: "Amelia Williams",
    role: "staff", roles: ["staff"],
    careHomeId: "home-oakfield", careHomeName: "Oakfield House",
    password: "CareHomeOS!2026",
  },
  "manager@demo.com": {
    id: "usr-manager-demo-001", name: "Demo Manager",
    role: "care_home_admin", roles: ["care_home_admin"],
    careHomeId: "home-demo", careHomeName: "Demo Care Home Ltd",
    adminLevel: "registered_manager",
    password: "DemoManager123!",
  },
  "admin@demo.com": {
    id: "usr-admin-demo-001", name: "Demo Admin",
    role: "super_admin", roles: ["super_admin"],
    careHomeName: "CQC Assistant Platform", platformScope: "carehomeos_company",
    password: "DemoAdmin123!",
  },
  "staff@demo.com": {
    id: "usr-staff-demo-001", name: "Demo Staff",
    role: "staff", roles: ["staff"],
    careHomeId: "home-demo", careHomeName: "Demo Care Home Ltd",
    password: "DemoStaff123!",
  },
};

type LoginInput = {
  email: string;
  password: string;
  returnTo: string | null;
  wantsRedirect: boolean;
};

function applySessionCookies(response: NextResponse, request: NextRequest, session: AuthSession) {
  // eslint-disable-next-line no-console
  console.log("[local-callback] setting cookies for session:", {
    email: session.email,
    role: session.role,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
  applyAuthCookies(response, request, session);
}

function loginSuccessResponse(
  request: NextRequest,
  session: AuthSession,
  returnTo: string,
  wantsRedirect: boolean,
) {
  const destination = resolvePostLoginPath(session, returnTo);

  if (wantsRedirect) {
    const response = NextResponse.redirect(new URL(destination, getPublicOrigin(request)), 303);
    applySessionCookies(response, request, session);
    return response;
  }

  const response = NextResponse.json({ authenticated: true, destination });
  applySessionCookies(response, request, session);
  return response;
}

function loginErrorResponse(
  request: NextRequest,
  message: string,
  wantsRedirect: boolean,
  email?: string,
  returnTo?: string | null,
) {
  if (wantsRedirect) {
    const url = new URL("/login", getPublicOrigin(request));
    url.searchParams.set("localError", message);
    if (email) url.searchParams.set("email", email);
    if (returnTo) url.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.json({ authenticated: false, message }, { status: 401 });
}

async function parseLoginRequest(request: NextRequest): Promise<LoginInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      returnTo?: string;
      redirect?: boolean;
    };
    return {
      email: body.email?.trim().toLowerCase() ?? "",
      password: body.password ?? "",
      returnTo: body.returnTo ?? null,
      wantsRedirect: body.redirect === true,
    };
  }

  const form = await request.formData();
  return {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
    returnTo: form.get("returnTo") ? String(form.get("returnTo")) : null,
    wantsRedirect: true,
  };
}

export async function POST(request: NextRequest) {
  let input: LoginInput;
  try {
    input = await parseLoginRequest(request);
  } catch {
    return loginErrorResponse(request, "Invalid login request.", false);
  }

  const { email, password, returnTo: rawReturnTo, wantsRedirect } = input;
  const returnTo = sanitizeReturnTo(rawReturnTo);
  const apiBase = getApiBase();

  // eslint-disable-next-line no-console
  console.log("[local-callback] attempting login for:", email, "backend:", apiBase);

  // ── 1. Try the real backend first ──────────────────────────────────────────
  try {
    const loginResponse = await fetchWithRetry(
      `${apiBase}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      },
    );

    // eslint-disable-next-line no-console
    console.log("[local-callback] backend response status:", loginResponse.status);

    const payload = (await loginResponse.json()) as {
      authenticated?: boolean;
      message?: string;
      token?: string;
      user?: {
        id?: string; name?: string; email?: string; role?: string; roles?: string[];
        care_home_id?: string | null; care_home_name?: string | null;
        admin_level?: string | null; platform_scope?: string | null;
      };
      next?: string;
    };

    // eslint-disable-next-line no-console
    console.log("[local-callback] backend payload:", { authenticated: payload.authenticated, message: payload.message, hasUser: Boolean(payload.user) });

    if (!payload.authenticated) {
      return loginErrorResponse(
        request,
        payload.message ?? "Invalid credentials",
        wantsRedirect,
        email,
        rawReturnTo,
      );
    }

    const user = payload.user ?? {};
    const role = user.role ?? "care_home_admin";
    const roles = user.roles ?? [role];

    const session = buildAuthSession({
      name: user.name ?? "CareHomeOS user",
      email: user.email ?? email,
      role,
      roles,
      careHomeId: user.care_home_id ?? null,
      careHomeName: user.care_home_name ?? null,
      adminLevel: user.admin_level ?? null,
      platformScope: user.platform_scope ?? null,
      idToken: payload.token ?? undefined,
    });

    // eslint-disable-next-line no-console
    console.log("[local-callback] session built:", { role: session.role, destination: resolvePostLoginPath(session, returnTo) });

    return loginSuccessResponse(request, session, returnTo, wantsRedirect);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("[local-callback] backend unreachable, falling back to local demo users. Error:", err instanceof Error ? err.message : String(err));
    // Backend unreachable — fall through to local demo-user check
  }

  // ── 2. Backend offline: authenticate against hardcoded demo users ──────────
  const demoUser = LOCAL_DEMO_USERS[email];
  if (demoUser && demoUser.password === password) {
    const session = buildAuthSession({
      name: demoUser.name,
      email,
      role: demoUser.role,
      roles: demoUser.roles,
      careHomeId: demoUser.careHomeId ?? null,
      careHomeName: demoUser.careHomeName ?? null,
      adminLevel: demoUser.adminLevel ?? null,
      platformScope: demoUser.platformScope ?? null,
    });
    return loginSuccessResponse(request, session, returnTo, wantsRedirect);
  }

  return loginErrorResponse(
    request,
    demoUser
      ? "Incorrect password for this demo account."
      : "Backend is offline and this email is not a recognised demo account. Start the backend or use a demo email such as manager@oakfield.local.",
    wantsRedirect,
    email,
    rawReturnTo,
  );
}
