"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { careHomes, plans } from "../../lib/demo-data";
import { normalizeRole } from "../../lib/rbac";

type SessionSummary = {
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  adminLevel?: string | null;
  platformScope?: string | null;
};

const currentHome = careHomes[0];
const currentPlan = plans.find((plan) => plan.name === currentHome.plan) ?? plans[0];

function readCookieSummary() {
  const row = document.cookie.split("; ").find((item) => item.startsWith("carehomeos.auth.summary="));
  if (!row) return null;
  try {
    const value = decodeURIComponent(row.split("=").slice(1).join("="));
    if (value.startsWith("{")) return JSON.parse(value) as SessionSummary;
    return JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/"))) as SessionSummary;
  } catch {
    return null;
  }
}

export default function PlansClient() {
  const router = useRouter();
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem("carehomeos.user");
    if (raw) {
      try {
        setSession(JSON.parse(raw) as SessionSummary);
      } catch {
        window.localStorage.removeItem("carehomeos.user");
      }
    }

    const cookieUser = readCookieSummary();
    if (cookieUser) setSession(cookieUser);

    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.user) setSession(payload.user);
      })
      .catch(() => undefined)
      .finally(() => setAuthChecked(true));
  }, []);

  const role = normalizeRole(session);

  useEffect(() => {
    if (authChecked && role === "sub_admin") {
      router.replace("/dashboard");
    }
    if (authChecked && role === "staff") {
      router.replace("/staff-reporting");
    }
  }, [authChecked, role, router]);

  if (!authChecked && !session) {
    return (
      <div className="card">
        <span className="badge">Checking session</span>
        <h2 className="sectionTitle">Loading plan workspace</h2>
        <p className="muted">Confirming whether this is platform or care-home administration.</p>
      </div>
    );
  }

  if (role === "super_admin") {
    const mrr = careHomes.reduce((total, home) => total + Number(home.mrr.replace(/[^0-9]/g, "")), 0);
    const activeHomes = careHomes.filter((home) => home.status === "Active").length;
    const trialHomes = careHomes.filter((home) => home.status === "Trialing").length;
    const residents = careHomes.reduce((total, home) => total + home.residents, 0);
    const admins = careHomes.reduce((total, home) => total + home.admins, 0);
    const averageCqc = Math.round(careHomes.reduce((total, home) => total + home.cqc, 0) / careHomes.length);

    return (
      <div className="stack">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Platform subscriptions</p>
            <h2 className="pageTitle">CareHomeOS customer estate and infrastructure metadata</h2>
            <p className="pageLead">Company admins monitor subscribed care homes, resident volumes, plan mix, onboarding status, infrastructure footprint, and support readiness.</p>
          </div>
          <Link className="btn primary" href="/platform-admin">Platform overview</Link>
        </div>

        <section className="metrics">
          <div className="metricTile detailMetric"><p className="metricLabel">Subscribed homes</p><p className="metricValue">{careHomes.length}</p><p className="muted">{activeHomes} active, {trialHomes} trialing</p></div>
          <div className="metricTile detailMetric"><p className="metricLabel">Residents supported</p><p className="metricValue">{residents}</p><p className="muted">Across all tenants</p></div>
          <div className="metricTile detailMetric"><p className="metricLabel">Care-home admins</p><p className="metricValue">{admins}</p><p className="muted">Operational admin seats</p></div>
          <div className="metricTile detailMetric"><p className="metricLabel">Platform MRR</p><p className="metricValue">GBP {mrr}</p><p className="muted">Current recurring revenue</p></div>
          <div className="metricTile detailMetric"><p className="metricLabel">Average CQC readiness</p><p className="metricValue">{averageCqc}%</p><p className="muted">Portfolio evidence score</p></div>
        </section>

        <section className="split">
          <div className="tableWrap">
            <table>
              <thead><tr><th>Care home</th><th>Plan</th><th>Status</th><th>Residents</th><th>Admins</th><th>Infrastructure</th><th>MRR</th></tr></thead>
              <tbody>
                {careHomes.map((home) => (
                  <tr key={home.id}>
                    <td><strong>{home.name}</strong><br /><span className="muted">{home.provider}</span></td>
                    <td>{home.plan}</td>
                    <td><span className={home.status === "Active" ? "badge success" : "badge warning"}>{home.status}</span></td>
                    <td>{home.residents}</td>
                    <td>{home.admins}</td>
                    <td><span className="badge">tenant-db</span> <span className="badge">carehomeos-api</span></td>
                    <td>{home.mrr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="card">
            <h3 className="sectionTitle">Plan mix</h3>
            <ul className="list">
              {plans.map((plan) => {
                const count = careHomes.filter((home) => home.plan === plan.name).length;
                return (
                  <li className="listItem" key={plan.id}>
                    <span><strong>{plan.name}</strong><br /><span className="muted">{plan.limit}, {plan.admins}</span></span>
                    <span className={count ? "badge success" : "badge"}>{count} homes</span>
                  </li>
                );
              })}
            </ul>
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Plans and subscription</p>
          <h2 className="pageTitle">Choose the operating plan for each care home</h2>
          <p className="pageLead">Care home admins can review the active subscription, plan limits, trial status, and upgrade path before unlocking more homes, admins, and automation.</p>
        </div>
        <Link className="btn primary" href="/admin/users">Create test admin</Link>
      </div>

      <section className="hero">
        <div className="grid">
          <div>
            <p className="metricLabel">Current care home</p>
            <p className="metricValue">{currentHome.name}</p>
            <p className="muted">{currentHome.provider}</p>
          </div>
          <div>
            <p className="metricLabel">Subscription</p>
            <p className="metricValue">{currentHome.status}</p>
            <span className="badge success">{currentPlan.name}</span>
          </div>
          <div>
            <p className="metricLabel">Monthly recurring revenue</p>
            <p className="metricValue">{currentHome.mrr}</p>
            <p className="muted">{currentHome.residents} residents and {currentHome.admins} admins</p>
          </div>
        </div>
      </section>

      <section className="grid">
        {plans.map((plan) => (
          <article key={plan.id} className={`planCard ${plan.highlight ? "highlight" : ""}`}>
            <div>
              <span className={plan.highlight ? "badge" : "badge success"}>{plan.highlight ? "Recommended" : "Available"}</span>
              <h3>{plan.name}</h3>
              <p className="price">{plan.price}</p>
              <p className="muted">per care home, per month</p>
            </div>
            <div className="actions">
              <span className="badge">{plan.limit}</span>
              <span className="badge">{plan.admins}</span>
            </div>
            <ul className="list">
              {plan.features.map((feature) => (
                <li className="listItem" key={feature}><span>{feature}</span><span className="badge success">Included</span></li>
              ))}
            </ul>
            <Link className={plan.highlight ? "btn primary" : "btn"} href={`/plans?select=${plan.id}`}>Select {plan.name}</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
