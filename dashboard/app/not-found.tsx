import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack" style={{ maxWidth: 520, margin: "48px auto" }}>
      <span className="badge">404</span>
      <h1 className="pageTitle">Page not found</h1>
      <p className="pageLead">The page you requested does not exist or you may not have access to it.</p>
      <div className="actions">
        <Link className="btn primary" href="/dashboard">
          Go to dashboard
        </Link>
        <Link className="btn" href="/login">
          Sign in
        </Link>
      </div>
    </div>
  );
}
