"use client";

import Link from "next/link";

export default function SignOutClient() {
  function clearBrowserSession() {
    window.localStorage.removeItem("carehomeos.user");
    window.localStorage.removeItem("carehomeos.token");
    window.localStorage.removeItem("carehomeos.intendedRole");
    document.cookie = "carehomeos.auth.summary=; Max-Age=0; path=/; SameSite=Lax";
    document.cookie = "carehomeos.auth=; Max-Age=0; path=/; SameSite=Lax";
  }

  return (
    <main className="modalPage">
      <section className="modalCard signOutPageCard" role="dialog" aria-modal="true" aria-labelledby="sign-out-title">
        <span className="badge warning">Signing out</span>
        <h1 id="sign-out-title">Sign out of CareHomeOS?</h1>
        <p className="muted">You are about to end this CareHomeOS session and return to the public landing page.</p>
        <div className="actions modalActions">
          <Link className="btn" href="/dashboard">Continue working</Link>
          <form action="/api/auth/logout" method="post" onSubmit={clearBrowserSession}>
            <button className="btn primary" type="submit">Sign out</button>
          </form>
        </div>
      </section>
    </main>
  );
}
