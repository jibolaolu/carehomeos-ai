"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PlatformOverview = {
  checked_at: string;
  services: Record<string, boolean>;
  care_homes: Array<{
    id: string;
    name: string;
    provider: string;
    plan: string;
    subscription_status: string;
    residents: number;
    admins: number;
    cqc_score: number;
    monthly_value_gbp: number;
  }>;
  users: Array<{ id: string; email: string; role: string }>;
  subscriptions: Array<{
    care_home: {
      id: string;
      name: string;
      provider: string;
      plan: string;
      subscription_status: string;
      residents: number;
      admins: number;
      cqc_score: number;
      monthly_value_gbp: number;
    };
    plan: {
      id: string;
      name: string;
      price_gbp: number;
      resident_limit: number | string;
      admin_limit: number | string;
      features: string[];
    };
    usage: { residents: number; admins: number };
    limits: { residents: number | null; admins: number | null };
    remaining: { residents: number | null; admins: number | null };
    feature_flags: Record<string, boolean>;
  }>;
  metrics: {
    active_homes: number;
    trialing_homes: number;
    monthly_recurring_revenue_gbp: number;
    super_admins: number;
    care_home_admins: number;
    sub_admins: number;
    staff_users: number;
  };
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";

const supportTickets = [
  { id: "SUP-204", home: "Oakfield House", title: "Auth0 callback confirmation", severity: "Medium", owner: "Platform support", status: "Waiting on customer" },
  { id: "SUP-198", home: "Lakeview Manor", title: "Rota publish warning on week rollover", severity: "High", owner: "Engineering", status: "Investigating" },
  { id: "SUP-193", home: "Oakfield House", title: "Invoice export format tweak", severity: "Low", owner: "Finance ops", status: "Planned" },
];

const onboardingRows = [
  { home: "Willowbrook Lodge", stage: "Contract review", plan: "Professional", owner: "Sofia Platform", risk: "Legal terms pending" },
  { home: "Rosemary Court", stage: "Auth0 + DNS", plan: "Starter", owner: "Implementation", risk: "Callback URLs not confirmed" },
  { home: "Harbour View", stage: "Data migration", plan: "Enterprise", owner: "Engineering", risk: "Waiting on legacy export" },
];

function badgeClass(status: string) {
  if (["active", "healthy", "stable", "monitoring", "online"].includes(status.toLowerCase())) return "badge success";
  if (["trialing", "medium", "planned", "waiting on customer", "watching"].includes(status.toLowerCase())) return "badge warning";
  if (["high", "investigating", "degraded"].includes(status.toLowerCase())) return "badge danger";
  return "badge";
}

function formatLimit(value: number | null) {
  return value === null ? "Unlimited" : String(value);
}

function formatCheckedAt(value?: string) {
  if (!value) return "waiting for first backend refresh";
  const date = new Date(value);
  return `refreshed ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

export default function PlatformAdminClient() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOverview() {
      try {
        const response = await fetch(`${apiBase}/admin/platform-overview`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Platform overview failed: ${response.status}`);
        }
        const payload = (await response.json()) as PlatformOverview;
        if (!cancelled) {
          setOverview(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not refresh platform overview.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOverview();
    const interval = window.setInterval(fetchOverview, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const subscriptions = overview?.subscriptions ?? [];
  const metrics = overview?.metrics;
  const services = overview?.services ?? { database: false, redis: false, s3: false };

  const estateMapping = useMemo(
    () => subscriptions.map((item) => ({
      id: item.care_home.id,
      name: item.care_home.name,
      provider: item.care_home.provider,
      plan: item.plan.name,
      monthlyValue: item.care_home.monthly_value_gbp,
      status: item.care_home.subscription_status,
      residents: item.usage.residents,
      admins: item.usage.admins,
      cqc: item.care_home.cqc_score,
      residentLimit: item.limits.residents,
      adminLimit: item.limits.admins,
      infrastructureTier: item.plan.id === "enterprise" ? "Dedicated eligible" : "Shared",
      ticketCount: supportTickets.filter((ticket) => ticket.home === item.care_home.name).length,
      features: item.feature_flags,
    })),
    [subscriptions],
  );

  const infrastructureCards = [
    { label: "API uptime", value: services.database && services.redis && services.s3 ? "99.96%" : "Degraded", state: services.database && services.redis && services.s3 ? "Stable" : "Degraded", tone: "toneBlue", dot: "blue", note: "Backend, worker, and storage heartbeat from the local stack." },
    { label: "Postgres cluster", value: services.database ? "Protected" : "Offline", state: services.database ? "Online" : "Offline", tone: services.database ? "toneGreen" : "toneAmber", dot: services.database ? "green" : "amber", note: "Shared tenant database health from the backend readiness checks." },
    { label: "Redis queue lag", value: services.redis ? "Within range" : "Needs review", state: services.redis ? "Watching" : "Blocked", tone: services.redis ? "toneAmber" : "toneAmber", dot: "amber", note: "Queue and cache heartbeat refreshed every 5 seconds." },
    { label: "Object storage", value: services.s3 ? "Flowing" : "Unavailable", state: services.s3 ? "Healthy" : "Offline", tone: services.s3 ? "toneTeal" : "toneAmber", dot: services.s3 ? "teal" : "amber", note: "Uploads, exports, and audio storage readiness from S3-compatible storage." },
  ];

  return (
    <div className="stack platformAdminPage">
      <div className="hero platformHero">
        <div>
          <p className="eyebrow">CareHomeOS company admin</p>
          <h2 className="pageTitle">Platform operations, subscriptions, and support</h2>
          <p className="pageLead">Super admins are CareHomeOS company staff. They track care-home plan assignment, infrastructure readiness, onboarding pipeline, support demand, and overall tenant health from one control-plane view.</p>
        </div>
        <div className="platformHeroActions">
          <Link className="btn primary" href="/plans">Review plans</Link>
          <Link className="btn" href="/platform-admin#support">Support queue</Link>
        </div>
      </div>

      {error ? <div className="notice"><strong>Live refresh warning</strong><p>{error}</p></div> : null}

      <section className="metrics platformMetrics">
        <div className="metricTile detailMetric"><p className="metricLabel">Subscribed care homes</p><p className="metricValue">{metrics?.active_homes ?? 0}</p><p className="muted">{metrics?.trialing_homes ?? 0} trialing</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Monthly recurring revenue</p><p className="metricValue">GBP {metrics?.monthly_recurring_revenue_gbp ?? 0}</p><p className="muted">Live from subscribed homes</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Residents supported</p><p className="metricValue">{estateMapping.reduce((total, home) => total + home.residents, 0)}</p><p className="muted">Plan-governed resident usage</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Open support tickets</p><p className="metricValue">{supportTickets.filter((ticket) => ticket.status !== "Planned").length}</p><p className="muted">Company-side queue needing action</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Company super admins</p><p className="metricValue">{metrics?.super_admins ?? 0}</p><p className="muted">Platform operators with full access</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Care-home admins</p><p className="metricValue">{(metrics?.care_home_admins ?? 0) + (metrics?.sub_admins ?? 0)}</p><p className="muted">Plan-governed admin usage</p></div>
      </section>

      <section className="split platformAdminSplit">
        <div className="tableWrap" id="subscriptions">
          <table>
            <thead>
              <tr><th>Care home</th><th>Plan mapping</th><th>Usage</th><th>Infrastructure</th><th>Feature gates</th><th>Support</th></tr>
            </thead>
            <tbody>
              {estateMapping.map((home) => (
                <tr key={home.id}>
                  <td><strong>{home.name}</strong><br /><span className="muted">{home.provider}</span></td>
                  <td><strong>{home.plan}</strong><br /><span className="muted">GBP {home.monthlyValue} MRR · {home.status}</span></td>
                  <td>
                    <strong>{home.residents}/{formatLimit(home.residentLimit)} residents</strong><br />
                    <span className="muted">{home.admins}/{formatLimit(home.adminLimit)} admins · CQC {home.cqc}%</span>
                  </td>
                  <td><span className="badge">{home.infrastructureTier}</span><br /><span className="muted">database, redis, storage polled live</span></td>
                  <td>
                    <span className={home.features.finance_exports ? "badge success" : "badge"}>Finance exports</span>{" "}
                    <span className={home.features.multilingual_voice_notes ? "badge success" : "badge"}>Voice notes</span>{" "}
                    <span className={home.features.portfolio_controls ? "badge success" : "badge"}>Portfolio</span>
                  </td>
                  <td>{home.ticketCount} tickets<br /><span className="muted">Last refreshed {formatCheckedAt(overview?.checked_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="card platformAdminRail">
          <h3 className="sectionTitle">Seeded login users</h3>
          <ul className="list">
            {(overview?.users ?? []).map((user) => (
              <li className="listItem" key={user.id}>
                <span><strong>{user.email}</strong><br /><span className="muted">{user.role.replaceAll("_", " ")}</span></span>
                <span className="badge">local</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="split platformAdminSplit" id="infrastructure">
        <div className="card platformInfraCard">
          <div className="listItem">
            <div>
              <h3 className="sectionTitle">Infrastructure monitoring</h3>
              <div className="liveStatusLine"><span className="liveDot" /> Live poll every 5 seconds · {formatCheckedAt(overview?.checked_at)}</div>
            </div>
            <span className="badge success">Live backend sync</span>
          </div>
          <div className="platformInfraGrid">
            {infrastructureCards.map((card) => (
              <article className={`platformInfraMetric ${card.tone}`} key={card.label}>
                <div className="platformInfraMetricTop">
                  <span className="metricLabel">{card.label}</span>
                  <span className={`statusDot ${card.dot}`}>{card.state}</span>
                </div>
                <strong>{card.value}</strong>
                <p className="muted">{card.note}</p>
              </article>
            ))}
          </div>
          <div className="tableWrap compactTableWrap">
            <table>
              <thead><tr><th>Home</th><th>Tier</th><th>Database</th><th>Redis</th><th>Storage</th><th>Status</th></tr></thead>
              <tbody>
                {estateMapping.map((home) => (
                  <tr key={home.id}>
                    <td><strong>{home.name}</strong></td>
                    <td>{home.infrastructureTier}</td>
                    <td>{services.database ? "Online" : "Offline"}</td>
                    <td>{services.redis ? "Online" : "Offline"}</td>
                    <td>{services.s3 ? "Healthy" : "Offline"}</td>
                    <td><span className={badgeClass(services.database && services.redis && services.s3 ? "stable" : "degraded")}>{services.database && services.redis && services.s3 ? "Monitoring" : "Degraded"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card platformOnboardingCard">
          <h3 className="sectionTitle">Onboarding and change queue</h3>
          <ul className="list">
            {onboardingRows.map((row) => (
              <li className="listItem" key={row.home}>
                <span><strong>{row.home}</strong><br /><span className="muted">{row.stage} · {row.plan}</span></span>
                <span className="badge warning">{row.owner}</span>
              </li>
            ))}
          </ul>
          <div className="notice">
            <strong>Current onboarding risk</strong>
            <p>Two homes are waiting on external dependencies before go-live: Auth0 callback confirmation and legacy export access.</p>
          </div>
        </aside>
      </section>

      <section className="split platformAdminSplit" id="support">
        <div className="card platformSupportCard">
          <div className="listItem">
            <h3 className="sectionTitle">Support and ticketing</h3>
            <span className="badge warning">{supportTickets.filter((ticket) => ticket.status !== "Planned").length} open</span>
          </div>
          <div className="platformTicketList">
            {supportTickets.map((ticket) => (
              <article className="platformTicketCard" key={ticket.id}>
                <div className="listItem compactListItem">
                  <span className={badgeClass(ticket.severity)}>{ticket.severity}</span>
                  <span className="badge">{ticket.id}</span>
                </div>
                <h4>{ticket.title}</h4>
                <p className="muted">{ticket.home}</p>
                <div className="platformTicketMeta">
                  <span><strong>Owner</strong> {ticket.owner}</span>
                  <span><strong>Status</strong> {ticket.status}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="card platformSupportCard">
          <h3 className="sectionTitle">Platform focus for today</h3>
          <ul className="list">
            <li className="listItem"><span><strong>Plan review</strong><br /><span className="muted">Confirm Oakfield trial conversion path</span></span><span className="badge warning">Today</span></li>
            <li className="listItem"><span><strong>Infrastructure check</strong><br /><span className="muted">Validate shared queue and database health</span></span><span className="badge success">Live</span></li>
            <li className="listItem"><span><strong>Customer support</strong><br /><span className="muted">Close Auth0 callback ticket after retest</span></span><span className="badge">Queued</span></li>
          </ul>
        </aside>
      </section>

      {loading ? <div className="notice"><strong>Loading platform data</strong><p>Pulling subscriptions, service health, and plan usage from the backend.</p></div> : null}
    </div>
  );
}
