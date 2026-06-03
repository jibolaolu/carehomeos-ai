"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ── Demo users for developer quick-login ──────────────────── */
const DEV_USERS = [
  {
    label: "Platform admin",
    role: "super_admin",
    email: "superadmin@carehomeos.local",
    password: "CareHomeOS!2026",
    colour: "#7c3aed",
  },
  {
    label: "Care home admin",
    role: "care_home_admin",
    email: "manager@oakfield.local",
    password: "CareHomeOS!2026",
    colour: "#2563eb",
  },
  {
    label: "Deputy manager",
    role: "sub_admin",
    email: "deputy@oakfield.local",
    password: "CareHomeOS!2026",
    colour: "#0891b2",
  },
  {
    label: "Care staff",
    role: "staff",
    email: "staff@oakfield.local",
    password: "CareHomeOS!2026",
    colour: "#16a34a",
  },
] as const;

const AUTH0_ERROR_MESSAGES: Record<string, string> = {
  "not-configured":
    "Auth0 is not fully configured on the dashboard server. Use quick login below, or add AUTH0_* vars to carehomeos/.env and restart.",
  "token-exchange-failed":
    "Auth0 token exchange failed. Confirm AUTH0_CLIENT_SECRET is loaded and the callback URL matches exactly.",
  "access_denied": "Auth0 sign-in was cancelled or denied.",
  "missing-code": "Auth0 did not return an authorization code.",
  "callback-network-error": "Could not reach Auth0 to complete sign-in.",
  "invalid_grant":
    "Auth0 rejected the authorization code. The callback URL in Auth0 must exactly match https://carehomeos.localtest.me/api/auth/callback",
};

export default function LoginClient() {
  const searchParams = useSearchParams();
  const auth0Param = searchParams.get("auth0");
  const auth0Desc = searchParams.get("auth0_desc");
  const auth0Missing = auth0Param === "not-configured";

  const [auth0Configured, setAuth0Configured] = useState<boolean | null>(null);

  // Always show the developer sign-in section so role chips are immediately
  // accessible without having to discover the toggle.
  const [showDev, setShowDev] = useState(true);
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(() => {
    if (searchParams.get("localError")) return searchParams.get("localError") ?? "";
    if (auth0Param && auth0Param !== "not-configured") {
      return auth0Desc || AUTH0_ERROR_MESSAGES[auth0Param] || `Auth0 error: ${auth0Param}`;
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/status", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setAuth0Configured(Boolean(payload?.auth0Configured)))
      .catch(() => setAuth0Configured(false));
  }, []);

  // Do NOT auto-redirect authenticated users away from /login.
  // They may be here intentionally to switch to a different role.
  // Clicking a chip overwrites the existing session cookie and navigates to the
  // new role home page.

  function signInWithAuth0() {
    const returnTo = searchParams.get("returnTo");
    const url = returnTo
      ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/api/auth/login";
    window.location.href = url;
  }

  /**
   * Core sign-in function — used by both role chips and the credential form.
   * Sends credentials as JSON to /api/auth/local-callback so we get a clean
   * JSON response back (no full-page navigation on error, inline message shown).
   * On success the route returns { authenticated: true, destination } and we
   * do a hard navigation to the destination so the new session cookies are sent.
   */
  async function signInWith(signInEmail: string, signInPassword: string) {
    setLoading(true);
    setActiveQuick(signInEmail);
    setMessage("Signing in…");
    try {
      const response = await fetch("/api/auth/local-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: signInEmail,
          password: signInPassword,
          returnTo: searchParams.get("returnTo") ?? null,
        }),
      });

      const payload = (await response.json()) as {
        authenticated?: boolean;
        destination?: string;
        message?: string;
      };

      // eslint-disable-next-line no-console
      console.log("[LoginClient] local-callback response:", payload);

      if (payload.authenticated && payload.destination) {
        // Hard navigation so cookies set by the route are sent on the next request.
        window.location.href = payload.destination;
        return;
      }

      throw new Error(payload.message ?? "Invalid credentials.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not sign in — try again.");
      setLoading(false);
      setActiveQuick(null);
    }
  }

  function localLogin(event: FormEvent) {
    event.preventDefault();
    void signInWith(email, password);
  }

  return (
    <main className="signInPage">
      <section className="signInCard">

        {/* Brand */}
        <div className="signInBrand">
          <span className="signInLogoMark">CH</span>
          <div className="signInBrandText">
            <strong>CareHomeOS</strong>
            <small>Operational Intelligence Platform</small>
          </div>
        </div>

        {/* Copy */}
        <div className="signInCopy">
          <h1 className="signInTitle">Sign in</h1>
          <p className="signInSub">
            Care home operations, staff management, rota, and compliance —
            in one platform.
          </p>
        </div>

        {/* Primary Auth0 button */}
        {auth0Missing || auth0Configured === false ? (
          <div className="signInWarning">
            Auth0 is not configured on the server — use quick login below.
          </div>
        ) : (
          <button
            className="signInPrimaryBtn"
            type="button"
            disabled={loading || auth0Configured === null}
            onClick={signInWithAuth0}
          >
            {auth0Configured === null ? "Checking Auth0…" : "Sign in with CareHomeOS"}
          </button>
        )}

        {/* Dev sign-in toggle — starts expanded; click to collapse */}
        <button
          className="signInDevToggle"
          type="button"
          onClick={() => setShowDev((v) => !v)}
        >
          {showDev ? "Hide role selector" : "Show role selector"}
        </button>

        {/* Session diagnostic link — useful when a login lands back here unexpectedly */}
        <p className="signInSessionCheck">
          Landed back here after login?{" "}
          <a href="/api/auth/whoami" target="_blank" rel="noreferrer">
            Check session state
          </a>{" "}
          to diagnose.
        </p>

        {showDev && (
          <div className="signInDevBox">

            {/* Quick-login role chips */}
            <div>
              <p className="signInDevSectionLabel">Quick login — choose a role</p>
              <div className="signInQuickGrid">
                {DEV_USERS.map((u) => {
                  const busy = loading && activeQuick === u.email;
                  return (
                    <button
                      key={u.email}
                      type="button"
                      className="signInQuickBtn"
                      style={{ "--quick-colour": u.colour } as React.CSSProperties}
                      disabled={loading}
                      onClick={() => void signInWith(u.email, u.password)}
                    >
                      <span className="signInQuickRole">{u.label}</span>
                      <span className="signInQuickEmail">{u.email}</span>
                      {busy && <span className="signInQuickSpinner" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="signInDevDivider">
              <span>or sign in with credentials</span>
            </div>

            {/* Custom credentials form — uses fetch so errors show inline */}
            <form onSubmit={localLogin} className="signInDevForm">
              <label className="signInDevLabel">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input signInDevInput"
                  autoComplete="email"
                  placeholder="user@example.local"
                />
              </label>
              <label className="signInDevLabel">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input signInDevInput"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </label>
              <button
                className="btn primary"
                type="submit"
                disabled={loading || !email || !password}
              >
                {loading && !activeQuick ? "Signing in…" : "Sign in locally"}
              </button>
            </form>

            {message ? <p className="signInMessage">{message}</p> : null}
          </div>
        )}

      </section>
    </main>
  );
}
