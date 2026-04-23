import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="auth0LikePage">
      <section className="auth0Card">
        <div className="auth0Logo" aria-hidden="true">CH</div>
        <h1>Reset your password</h1>
        <p>For local testing, use the seeded password. In Auth0 production mode, this page will connect to the Auth0 password reset email flow.</p>
        <div className="localLoginBox">
          <p className="muted">Local demo password: <code>CareHomeOS!2026</code></p>
        </div>
        <Link className="auth0Primary" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
