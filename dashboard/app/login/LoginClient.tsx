"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";

const demoUsers = [
  ["Care home admin", "manager@oakfield.local"],
  ["Assistant manager", "deputy@oakfield.local"],
  ["Staff reporting", "staff@oakfield.local"],
  ["CareHomeOS super admin", "superadmin@carehomeos.local"],
] as const;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "manager@oakfield.local");
  const [password, setPassword] = useState("CareHomeOS!2026");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLocal, setShowLocal] = useState(Boolean(searchParams.get("email")));

  async function localLogin(selectedEmail = email) {
    setLoading(true);
    setMessage("Signing in...");
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedEmail, password }),
      });
      const payload = await response.json();
      if (!payload.authenticated) {
        throw new Error(payload.message ?? "Invalid credentials");
      }
      window.localStorage.setItem("carehomeos.token", payload.token);
      window.localStorage.setItem("carehomeos.user", JSON.stringify(payload.user));
      window.localStorage.setItem("carehomeos.intendedRole", payload.user?.role ?? "care_home_admin");
      document.cookie = "carehomeos.signedout=; Max-Age=0; path=/; SameSite=Lax";
      router.push(payload.next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await localLogin();
  }

  return (
    <main className="auth0LikePage">
      <section className="auth0Card">
        <div className="auth0Logo" aria-hidden="true">CH</div>
        <h1>CareHomeOS sign in</h1>
        <p>Sign in to manage care homes, residents, staff, rota, care notes, and platform operations.</p>

        <div className="auth0Actions">
          <Link className="auth0Primary" href="/api/auth/login?returnTo=/dashboard" onClick={() => window.localStorage.setItem("carehomeos.intendedRole", "care_home_admin")}>
            Continue as care home admin
          </Link>
          <Link className="auth0Secondary" href="/api/auth/login?returnTo=/platform-admin" onClick={() => window.localStorage.setItem("carehomeos.intendedRole", "super_admin")}>
            <span aria-hidden="true">◇</span>
            Platform admin sign in
          </Link>
        </div>

        <button className="auth0TextButton" type="button" onClick={() => setShowLocal((value) => !value)}>
          Use local username and password
        </button>

        {showLocal ? (
          <div className="localLoginBox">
            <form className="localLoginForm" onSubmit={submit}>
              <label>Email<input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label>
              <label>Password<input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></label>
              <button className="btn primary" disabled={loading} type="submit">{loading ? "Signing in..." : "Sign in locally"}</button>
            </form>
            <div className="demoAccountStrip">
              {demoUsers.map(([label, demoEmail]) => (
                <button key={demoEmail} type="button" onClick={() => setEmail(demoEmail)}>
                  <strong>{label}</strong>
                  <span>{demoEmail}</span>
                </button>
              ))}
            </div>
            {message ? <p className="formMessage">{message}</p> : null}
          </div>
        ) : null}

        <div className="auth0Links">
          <span>Forgot your password? <Link href="/forgot-password">Reset it here</Link></span>
          <span>New care provider? <Link href="/plans">Create your account</Link></span>
          <small>Auth0 application type: <strong>Regular Web Application</strong>. Callback <code>/api/auth/callback</code></small>
        </div>
      </section>
    </main>
  );
}
