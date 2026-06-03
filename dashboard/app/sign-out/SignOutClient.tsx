"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Clears every trace of the current session from the browser.
 * Called both on confirm-button press and (optionally) on direct navigation
 * to /sign-out from the sign-out confirmation page.
 */
function clearBrowserSession() {
  // localStorage keys
  window.localStorage.removeItem("carehomeos.user");
  window.localStorage.removeItem("carehomeos.token");
  window.localStorage.removeItem("carehomeos.intendedRole");

  // Kill the summary cookie so the AppShell's client-side read also sees nothing
  for (const name of ["carehomeos.auth.summary", "carehomeos.auth"]) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax; Secure`;
  }
}

export default function SignOutClient() {
  const router = useRouter();
  // Only one POST is needed — use a ref to guard against double-invocations
  const hasNavigated = useRef(false);

  // Pre-clear client state immediately when the sign-out page loads,
  // so if the user hits Escape or Back, the shell already shows "signed out".
  useEffect(() => {
    clearBrowserSession();
  }, []);

  function handleSignOut() {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    clearBrowserSession();
    // The form action POST /api/auth/logout handles the cookie deletion
    // server-side and redirects to /.
  }

  return (
    <main className="modalPage">
      <section
        className="modalCard signOutPageCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-out-title"
      >
        <span className="badge warning">Signing out</span>
        <h1 id="sign-out-title">Sign out of CareHomeOS?</h1>
        <p className="muted">
          You are about to end this CareHomeOS session. All local session data
          will be cleared and you will be returned to the home page.
        </p>
        <div className="actions modalActions">
          <button className="btn" type="button" onClick={() => router.back()}>
            Cancel
          </button>
          {/* POST to /api/auth/logout — server clears httpOnly auth cookie */}
          <form action="/api/auth/logout" method="post" onSubmit={handleSignOut}>
            <button className="btn primary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
