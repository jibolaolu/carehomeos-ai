"use client";

import {
  Globe, Server, Bell, TrendingUp, Users, CreditCard,
  Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  ShieldCheck, ArrowUp, ArrowDown, Building2, LogOut,
  Flag, BarChart3, FileCheck, Layers, Settings,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ── Types ───────────────────────────────────────────────────── */
type ServiceDetail = {
  ok: boolean;
  latency_ms: number;
  region: string;
};

type PlatformOverview = {
  checked_at: string;
  services: Record<string, boolean>;
  service_detail: Record<string, ServiceDetail>;
  care_homes: Array<{
    id: string; name: string; provider: string; plan: string;
    subscription_status: string; residents: number; admins: number;
    cqc_score: number; monthly_value_gbp: number;
  }>;
  users: Array<{ id: string; email: string; role: string }>;
  subscriptions: Array<{
    care_home: {
      id: string; name: string; provider: string; plan: string;
      subscription_status: string; residents: number; admins: number;
      cqc_score: number; monthly_value_gbp: number;
    };
    plan: {
      id: string; name: string; price_gbp: number;
      resident_limit: number | string; admin_limit: number | string; features: string[];
    };
    usage: { residents: number; admins: number };
    limits: { residents: number | null; admins: number | null };
    remaining: { residents: number | null; admins: number | null };
    feature_flags: Record<string, boolean>;
  }>;
  metrics: {
    active_homes: number; trialing_homes: number;
    monthly_recurring_revenue_gbp: number;
    super_admins: number; care_home_admins: number; sub_admins: number; staff_users: number;
  };
};

/* ── Static demo data ─────────────────────────────────────────── */
const supportTickets = [
  { id: "SUP-204", home: "Oakfield House",  title: "Auth0 callback confirmation",           severity: "medium", status: "Waiting on customer" },
  { id: "SUP-198", home: "Lakeview Manor",  title: "Rota publish warning on week rollover", severity: "high",   status: "Investigating" },
  { id: "SUP-193", home: "Oakfield House",  title: "Invoice export format tweak",            severity: "low",    status: "Planned" },
];

const onboardingRows = [
  { home: "Willowbrook Lodge", stage: "Contract review", plan: "Professional", risk: "Legal terms pending" },
  { home: "Rosemary Court",    stage: "Auth0 + DNS",      plan: "Starter",      risk: "Callback URLs not confirmed" },
  { home: "Harbour View",      stage: "Data migration",  plan: "Enterprise",   risk: "Waiting on legacy export" },
];

/** Enterprise feature flags: all known platform features */
const ALL_FEATURES: Array<{ key: string; label: string; tier: "starter" | "professional" | "enterprise" }> = [
  { key: "care_notes",             label: "Care notes",            tier: "starter" },
  { key: "rota_management",        label: "Rota management",       tier: "starter" },
  { key: "mar_chart",              label: "MAR chart",             tier: "starter" },
  { key: "finance_exports",        label: "Finance exports",       tier: "professional" },
  { key: "cqc_assistant",          label: "CQC assistant",         tier: "professional" },
  { key: "multilingual_voice_notes", label: "Voice notes (ML)",   tier: "professional" },
  { key: "portfolio_controls",     label: "Portfolio controls",    tier: "enterprise" },
  { key: "api_access",             label: "API access",            tier: "enterprise" },
  { key: "custom_reporting",       label: "Custom reporting",      tier: "enterprise" },
  { key: "sso_saml",               label: "SSO / SAML",           tier: "enterprise" },
];

const complianceItems = [
  { label: "GDPR data processor agreements", status: "compliant",  updated: "Jan 2026" },
  { label: "CQC registration verification",  status: "compliant",  updated: "Mar 2026" },
  { label: "ISO 27001 audit",                status: "pending",    updated: "Due Jun 2026" },
  { label: "Annual data retention review",   status: "compliant",  updated: "Feb 2026" },
  { label: "Penetration testing",            status: "due",        updated: "Overdue" },
  { label: "Caldicott Guardian review",      status: "compliant",  updated: "Apr 2026" },
];

const apiQuotas = [
  { home: "Oakfield House",  plan: "Professional", requestsMonth: 45_320,  limit: 100_000 },
  { home: "Lakeview Manor",  plan: "Enterprise",   requestsMonth: 124_800, limit: 500_000 },
  { home: "Sunrise Gardens", plan: "Starter",      requestsMonth: 8_940,   limit: 20_000 },
];

const platformChangelog = [
  { version: "2.14.0", date: "22 May 2026", summary: "Real-time infra health latency from backend",     breaking: false },
  { version: "2.13.0", date: "18 May 2026", summary: "Platform admin control plane sidebar & KPIs",     breaking: false },
  { version: "2.12.0", date: "10 May 2026", summary: "CQC assistant voice notes with multilingual ML",  breaking: false },
  { version: "2.11.0", date: "01 May 2026", summary: "Auth0 PKCE login flow and session management",    breaking: true  },
  { version: "2.10.0", date: "14 Apr 2026", summary: "Rota conflict detection and auto-shift balancing", breaking: false },
];

/* ── Navigation items ─────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: "overview",        label: "Overview",         icon: Globe },
  { key: "homes",           label: "Care Homes",        icon: Building2 },
  { key: "infrastructure",  label: "Infrastructure",    icon: Server },
  { key: "support",         label: "Support",           icon: Bell },
  { key: "enterprise",      label: "Enterprise",        icon: Layers },
  { key: "billing",         label: "Billing",           icon: CreditCard },
  { key: "settings",        label: "Settings",          icon: Settings },
] as const;
type NavKey = (typeof NAV_ITEMS)[number]["key"];

/* ── Helpers ──────────────────────────────────────────────────── */
function fmtGbp(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-GB").format(n);
}

function formatCheckedAt(value?: string) {
  if (!value) return "waiting for first backend refresh";
  return `refreshed ${new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function formatLimit(value: number | null) {
  return value === null ? "∞" : String(value);
}

function fmtMs(ms: number) {
  if (ms < 1) return "<1ms";
  return `${Math.round(ms)}ms`;
}

function overallHealthFrom(
  detail: Record<string, ServiceDetail> | null,
  services: Record<string, boolean>,
): "healthy" | "degraded" | "down" {
  if (detail) {
    const nonApi = Object.entries(detail).filter(([k]) => k !== "api");
    if (nonApi.every(([, v]) => v.ok)) return "healthy";
    if (nonApi.some(([, v]) => v.ok)) return "degraded";
    return "down";
  }
  const vals = Object.values(services);
  if (vals.length === 0) return "down"; // no backend data → treat as down
  if (vals.every(Boolean)) return "healthy";
  if (vals.some(Boolean)) return "degraded";
  return "down";
}

/* ── Sub-components ───────────────────────────────────────────── */
function HealthDot({ status }: { status: "healthy" | "degraded" | "down" | "unknown" }) {
  const cls = { healthy: "platDotGreen", degraded: "platDotAmber", down: "platDotRed", unknown: "platDotGrey" };
  return <span className={`platDot ${cls[status]}`} />;
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    enterprise: "platBadgePurple", professional: "platBadgeIndigo",
    starter: "platBadgeGrey", trial: "platBadgeBlue",
  };
  return <span className={`platBadge ${map[plan?.toLowerCase()] ?? "platBadgeGrey"}`}>{plan}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "platBadgeGreen", trialing: "platBadgeBlue",
    past_due: "platBadgeRed", suspended: "platBadgeAmber", churned: "platBadgeGrey",
  };
  return <span className={`platBadge ${map[status?.toLowerCase()] ?? "platBadgeGrey"}`}>{status}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = { high: "platBadgeRed", medium: "platBadgeAmber", low: "platBadgeGrey" };
  return <span className={`platBadge ${map[severity] ?? "platBadgeGrey"}`}>{severity}</span>;
}

function PlatKpi({
  label, value, sub, icon: Icon, accent, urgent,
}: { label: string; value: string | number; sub?: string; icon: React.ElementType; accent: string; urgent?: boolean }) {
  return (
    <div
      className={`platKpiCard${urgent ? " platKpiCardUrgent" : ""}`}
      style={{ "--plat-accent": accent } as React.CSSProperties}
    >
      <div className="platKpiAccent" />
      <div className="platKpiIcon"><Icon size={15} strokeWidth={2.2} /></div>
      <div className="platKpiBody">
        <p className="platKpiLabel">{label}</p>
        <p className="platKpiValue">{value}</p>
        {sub && <p className="platKpiSub">{sub}</p>}
      </div>
    </div>
  );
}

function RevenueChart({ months }: { months: { label: string; mrrGbp: number }[] }) {
  const max = Math.max(...months.map((m) => m.mrrGbp), 1);
  return (
    <div className="platRevenueChart">
      {months.map((m, i) => {
        const pct = Math.round((m.mrrGbp / max) * 100);
        const isCurrent = i === months.length - 1;
        return (
          <div key={m.label} className="platRevenueBar">
            <div
              className={`platRevenueBarFill${isCurrent ? " platRevenueBarCurrent" : ""}`}
              style={{ height: `${pct}%` }}
              title={`${m.label}: ${fmtGbp(m.mrrGbp)}`}
            />
            <span className="platRevenueBarLabel">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Infra card definition ────────────────────────────────────── */
type InfraCard = { key: string; name: string; status: "healthy" | "degraded" | "down"; uptime: string; latencyMs: number; region: string; };

const UPTIME_LABEL: Record<string, string> = {
  api: "99.96%", database: "99.94%", redis: "99.89%", s3: "99.98%",
};

function buildInfraCards(
  detail: Record<string, ServiceDetail> | null,
  services: Record<string, boolean>,
  overallHealth: "healthy" | "degraded" | "down",
): InfraCard[] {
  function cardFor(key: string, displayName: string, fallbackOk: boolean, fallbackLatency: number, region: string): InfraCard {
    const svc = detail?.[key];
    const ok = svc ? svc.ok : fallbackOk;
    const latencyMs = svc ? svc.latency_ms : fallbackLatency;
    const svcRegion = svc?.region ?? region;
    let status: InfraCard["status"];
    if (key === "api") {
      status = ok ? (overallHealth === "down" ? "degraded" : "healthy") : "down";
    } else {
      status = ok ? "healthy" : (overallHealth === "down" ? "down" : "degraded");
    }
    return { key, name: displayName, status, uptime: ok ? (UPTIME_LABEL[key] ?? "99.9%") : "0%", latencyMs, region: svcRegion };
  }
  return [
    cardFor("api",      "API gateway",        true,  1,  "uk-south-1"),
    cardFor("database", "Postgres cluster",   false, 0,  "uk-south-1"),
    cardFor("redis",    "Redis / job queue",  false, 0,  "uk-south-1"),
    cardFor("s3",       "Object storage (S3)", false, 0, "global-cdn"),
  ];
}

/* ── Main component ───────────────────────────────────────────── */
export default function PlatformAdminClient() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavKey>("overview");

  useEffect(() => {
    let cancelled = false;

    async function fetchOverview() {
      try {
        // Use the Next.js proxy route instead of calling the backend directly.
        // This eliminates CORS issues and avoids needing nginx to route the
        // API subdomain — the server talks to the backend over plain HTTP
        // on 127.0.0.1 while the browser talks to the same-origin Next.js
        // route at /api/admin/platform-overview.
        const res = await fetch("/api/admin/platform-overview", { cache: "no-store" });
        const body = (await res.json()) as PlatformOverview & { _proxy_error?: boolean; detail?: string };

        if (!res.ok || body._proxy_error) {
          throw new Error(body.detail ?? `HTTP ${res.status}`);
        }

        if (!cancelled) { setOverview(body); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not refresh platform overview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOverview();
    const interval = window.setInterval(fetchOverview, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  function scrollTo(key: NavKey) {
    setActiveSection(key);
    document.getElementById(`plat-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const subscriptions  = overview?.subscriptions  ?? [];
  const metrics        = overview?.metrics;
  const services       = overview?.services       ?? {};
  const serviceDetail  = overview?.service_detail ?? null;
  const overallHealth  = overallHealthFrom(serviceDetail, services);
  const totalMrr       = metrics?.monthly_recurring_revenue_gbp ?? 0;

  const subscribers = useMemo(() =>
    subscriptions.map((item) => ({
      id: item.care_home.id,
      name: item.care_home.name,
      provider: item.care_home.provider,
      plan: item.plan.name,
      status: item.care_home.subscription_status,
      health:
        item.care_home.subscription_status === "active" && overallHealth === "healthy"
          ? "healthy" as const
          : overallHealth === "down" ? "down" as const : "degraded" as const,
      mrrGbp: item.care_home.monthly_value_gbp,
      residents: item.usage.residents,
      residentLimit: item.limits.residents,
      admins: item.usage.admins,
      adminLimit: item.limits.admins,
      cqc: item.care_home.cqc_score,
      tickets: supportTickets.filter((t) => t.home === item.care_home.name).length,
      features: item.feature_flags,
    })),
    [subscriptions, overallHealth],
  );

  // When the backend is offline, fall back to static demo entries so the
  // subscriber table, infra table, and feature-flag matrix are never empty.
  // Real backend data takes over automatically once the proxy responds.
  const displaySubscribers = useMemo(() => {
    if (subscribers.length > 0) return subscribers;
    const h = overallHealth === "down" ? "down" as const
      : overallHealth === "degraded" ? "degraded" as const
      : "healthy" as const;
    return [
      {
        id: "oakfield-house", name: "Oakfield House", provider: "Oakfield Care Ltd",
        plan: "Professional", status: "trialing", health: h,
        mrrGbp: 699, residents: 43, residentLimit: 60 as number | null,
        admins: 3, adminLimit: 5 as number | null, cqc: 88,
        tickets: supportTickets.filter((t) => t.home === "Oakfield House").length,
        features: {
          care_notes: true, rota_management: true, mar_chart: true,
          finance_exports: true, cqc_assistant: true, multilingual_voice_notes: false,
          portfolio_controls: false, api_access: false, custom_reporting: false, sso_saml: false,
        } as Record<string, boolean>,
      },
      {
        id: "lakeview-manor", name: "Lakeview Manor", provider: "Lakeview Care Group",
        plan: "Enterprise", status: "active", health: h,
        mrrGbp: 299, residents: 28, residentLimit: null as number | null,
        admins: 2, adminLimit: null as number | null, cqc: 92,
        tickets: supportTickets.filter((t) => t.home === "Lakeview Manor").length,
        features: {
          care_notes: true, rota_management: true, mar_chart: true,
          finance_exports: true, cqc_assistant: true, multilingual_voice_notes: true,
          portfolio_controls: true, api_access: true, custom_reporting: true, sso_saml: false,
        } as Record<string, boolean>,
      },
    ];
  }, [subscribers, overallHealth]);

  // KPI fallbacks — when the backend is offline, derive headline numbers from
  // displaySubscribers so the KPI cards match what the tables actually show.
  const displayMrr           = totalMrr > 0
    ? totalMrr
    : displaySubscribers.reduce((t, s) => t + s.mrrGbp, 0);
  const displayActiveHomes   = metrics?.active_homes
    ?? displaySubscribers.filter((s) => s.status === "active").length;
  const displayTrialingHomes = metrics?.trialing_homes
    ?? displaySubscribers.filter((s) => s.status === "trialing").length;

  const mrrMonths = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i);
      const label = d.toLocaleDateString("en-GB", { month: "short" });
      const frac = 0.72 + (i / 5) * 0.28;
      return { label, mrrGbp: Math.round(displayMrr * frac) };
    });
  }, [displayMrr]);

  const prevMrr   = mrrMonths[mrrMonths.length - 2]?.mrrGbp ?? 0;
  const mrrChange = displayMrr - prevMrr;

  const infraCards = useMemo(
    () => buildInfraCards(serviceDetail, services, overallHealth),
    [serviceDetail, services, overallHealth],
  );

  const alerts = [
    ...(overallHealth !== "healthy"
      ? [{ id: "infra-1", severity: "critical" as const, title: "Infrastructure degradation detected", detail: "One or more backend services are reporting unhealthy.", service: "Infrastructure", resolved: false }]
      : []),
    ...supportTickets
      .filter((t) => t.severity === "high")
      .map((t) => ({ id: t.id, severity: "warning" as const, title: t.title, detail: `${t.home} — ${t.status}`, service: "Support", resolved: false })),
  ];

  const degradedCount = infraCards.filter((c) => c.status !== "healthy").length;

  return (
    <div className="platShell">

      {/* ── Platform sidebar ──────────────────────────────────────── */}
      <aside className="platSidebar">
        <div className="platSidebarBrand">
          <span className="platSidebarLogo">CH</span>
          <div>
            <strong>CareHomeOS</strong>
            <small>Control Plane</small>
          </div>
        </div>

        <nav className="platSidebarNav">
          <span className="platSidebarSection">Platform</span>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`platSidebarLink${activeSection === key ? " active" : ""}`}
              onClick={() => scrollTo(key)}
              type="button"
            >
              <Icon size={14} strokeWidth={2.2} />
              {label}
            </button>
          ))}
        </nav>

        <div className="platSidebarFooter">
          <div className="platAlertItem platAlertItem--info" style={{ padding: "8px 10px", border: 0, background: "transparent" }}>
            <ShieldCheck size={13} style={{ color: "#16a34a", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#22c55e" }}>Super admin</p>
              <p style={{ margin: 0, fontSize: 10, color: "#334155" }}>Platform access</p>
            </div>
          </div>
          <Link href="/sign-out" className="platSidebarSignOut">
            <LogOut size={13} />
            Sign out
          </Link>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────── */}
      <div className="platContent">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="platHeader" id="plat-overview">
          <div>
            <p className="eyebrow">CareHomeOS company admin</p>
            <h2 className="platHeaderTitle">Control Plane</h2>
            <p className="platHeaderSub">
              Platform operations, subscriptions, and support ·{" "}
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="platHeaderActions">
            {alerts.some((a) => a.severity === "critical") && (
              <div className="platHeaderAlert">
                <XCircle size={13} />
                {alerts.filter((a) => a.severity === "critical").length} critical alert
                {alerts.filter((a) => a.severity === "critical").length !== 1 ? "s" : ""} require attention
              </div>
            )}
            <Link className="btn" href="/plans">Review plans</Link>
            <Link className="btn primary" href="/developer">Developer tools</Link>
          </div>
        </div>

        {error && (
          <div style={{
            background: "#1e293b", border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 10, padding: "14px 18px",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <XCircle size={16} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#f87171" }}>Backend unreachable</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                Cannot connect to the CareHomeOS API. Infrastructure health data is unavailable.
                Ensure the backend is running (<code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>./run-local.sh</code>) and Docker services are healthy.
                Retrying every 5 s — live data will appear automatically once the backend responds.
              </p>
            </div>
          </div>
        )}

        {/* ── KPI grid ─────────────────────────────────────────────── */}
        <div className="platKpiGrid">
          <PlatKpi
            label="Subscribed care homes"
            value={displayActiveHomes}
            sub={`${displayTrialingHomes} trialing`}
            icon={Globe} accent="#5b4df2"
          />
          <PlatKpi
            label="Monthly recurring revenue"
            value={fmtGbp(displayMrr)}
            sub={`${mrrChange >= 0 ? "+" : ""}${fmtGbp(mrrChange)} vs last month`}
            icon={CreditCard} accent="#12a594"
          />
          <PlatKpi
            label="Residents supported"
            value={displaySubscribers.reduce((t, h) => t + h.residents, 0)}
            sub="Across all care homes"
            icon={Users} accent="#f59e0b"
          />
          <PlatKpi
            label="System uptime"
            value={overallHealth === "healthy" ? "99.96%" : "Degraded"}
            sub={`${alerts.filter((a) => !a.resolved).length} open alerts`}
            icon={Activity} accent="#3b82f6" urgent={overallHealth !== "healthy"}
          />
          <PlatKpi
            label="Platform super admins"
            value={metrics?.super_admins ?? 0}
            sub="Full platform access"
            icon={ShieldCheck} accent="#8b5cf6"
          />
          <PlatKpi
            label="Open support tickets"
            value={supportTickets.filter((t) => t.status !== "Planned").length}
            sub={supportTickets.some((t) => t.severity === "high") ? "Requires attention" : "No critical items"}
            icon={Bell} accent="#dc2626"
            urgent={supportTickets.some((t) => t.severity === "high")}
          />
        </div>

        {/* ── Main grid (main + right rail) ────────────────────────── */}
        <div className="platGrid">

          {/* ── Main column ──────────────────────────────────────────── */}
          <div className="platMain">

            {/* Subscriber accounts */}
            <div className="platCard" id="plat-homes">
              <div className="platCardHeader">
                <Building2 size={14} strokeWidth={2.3} />
                <h3>Subscriber accounts</h3>
                <span className="platCardCount">{displaySubscribers.length}</span>
                <span className="liveStatusLine" style={{ marginLeft: "auto" }}>
                  <span className="liveDot" /> {formatCheckedAt(overview?.checked_at)}
                </span>
              </div>
              {loading ? (
                <p className="muted">Loading subscriber data…</p>
              ) : (
                <div className="platTableWrap">
                  <table className="platTable">
                    <thead>
                      <tr>
                        <th>Care home</th><th>Plan</th><th>Status</th><th>Health</th>
                        <th>MRR</th><th>Residents</th><th>Admins</th>
                        <th>CQC</th><th>Tickets</th><th>Features</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displaySubscribers.map((home) => (
                        <tr
                          key={home.id}
                          className={
                            home.status === "past_due" ? "platRowUrgent"
                            : home.health === "down" ? "platRowDown" : ""
                          }
                        >
                          <td>
                            <span className="platSubName">{home.name}</span>
                            <span className="platSubMeta">{home.provider}</span>
                          </td>
                          <td><PlanBadge plan={home.plan} /></td>
                          <td><StatusBadge status={home.status} /></td>
                          <td>
                            <div className="platHealthCell">
                              <HealthDot status={home.health} />
                              <span>{home.health}</span>
                            </div>
                          </td>
                          <td className="platNumCell">{fmtGbp(home.mrrGbp)}</td>
                          <td className="platNumCell">{home.residents}/{formatLimit(home.residentLimit)}</td>
                          <td className="platNumCell">{home.admins}/{formatLimit(home.adminLimit)}</td>
                          <td className="platNumCell">{home.cqc}%</td>
                          <td className="platNumCell">
                            {home.tickets > 0
                              ? <span className="platTicketBadge">{home.tickets}</span>
                              : "—"}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              <span className={home.features.finance_exports ? "platBadge platBadgeGreen" : "platBadge platBadgeGrey"}>Finance</span>
                              <span className={home.features.multilingual_voice_notes ? "platBadge platBadgeGreen" : "platBadge platBadgeGrey"}>Voice</span>
                              <span className={home.features.portfolio_controls ? "platBadge platBadgeGreen" : "platBadge platBadgeGrey"}>Portfolio</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {displaySubscribers.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ color: "var(--muted)", textAlign: "center", padding: "24px" }}>
                            No subscriber data yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Infrastructure health */}
            <div className="platCard" id="plat-infrastructure">
              <div className="platCardHeader">
                <Server size={14} strokeWidth={2.3} />
                <h3>Infrastructure health</h3>
                <span className={`platCardCount${degradedCount > 0 ? "Red" : ""}`}>
                  {degradedCount > 0 ? `${degradedCount} degraded` : "All healthy"}
                </span>
                <span className="liveStatusLine" style={{ marginLeft: "auto" }}>
                  <span className="liveDot" /> live poll every 5 s
                </span>
              </div>

              <div className="platInfraGrid">
                {infraCards.map((card) => (
                  <div
                    key={card.key}
                    className={`platInfraCard platInfra${card.status.charAt(0).toUpperCase() + card.status.slice(1)}`}
                  >
                    <div className="platInfraTop">
                      <HealthDot status={card.status} />
                      <span className="platInfraName">{card.name}</span>
                    </div>
                    <div className="platInfraMeta">
                      <span>{card.uptime} uptime</span>
                      <span>{fmtMs(card.latencyMs)} avg</span>
                      <span className="platInfraRegion">{card.region}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="platTableWrap" style={{ marginTop: 0 }}>
                <table className="platTable">
                  <thead>
                    <tr>
                      <th>Home</th><th>Plan</th><th>Database</th>
                      <th>Redis</th><th>Storage</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displaySubscribers.map((home) => {
                      const dbOk    = serviceDetail?.database?.ok ?? services.database;
                      const redisOk = serviceDetail?.redis?.ok    ?? services.redis;
                      const s3Ok    = serviceDetail?.s3?.ok       ?? services.s3;
                      return (
                        <tr key={home.id}>
                          <td><strong>{home.name}</strong></td>
                          <td>{home.plan}</td>
                          <td>
                            {dbOk
                              ? <span className="platBadge platBadgeGreen">Online</span>
                              : <span className="platBadge platBadgeRed">Offline</span>}
                          </td>
                          <td>
                            {redisOk
                              ? <span className="platBadge platBadgeGreen">Online</span>
                              : <span className="platBadge platBadgeAmber">Needs review</span>}
                          </td>
                          <td>
                            {s3Ok
                              ? <span className="platBadge platBadgeGreen">Healthy</span>
                              : <span className="platBadge platBadgeAmber">Degraded</span>}
                          </td>
                          <td><HealthDot status={overallHealth} /></td>
                        </tr>
                      );
                    })}
                    {displaySubscribers.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} style={{ color: "var(--muted)", textAlign: "center", padding: "16px" }}>
                          No subscribers yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Support tickets */}
            <div className="platCard" id="plat-support">
              <div className="platCardHeader">
                <Bell size={14} strokeWidth={2.3} />
                <h3>Support tickets</h3>
                {supportTickets.filter((t) => t.status !== "Planned").length > 0 && (
                  <span className="platCardCountRed">
                    {supportTickets.filter((t) => t.status !== "Planned").length} open
                  </span>
                )}
              </div>
              <div className="platTicketGrid">
                {supportTickets.map((ticket) => (
                  <article className="platTicketItem" key={ticket.id}>
                    <div className="platTicketItemTop">
                      <SeverityBadge severity={ticket.severity} />
                      <span className="platBadge platBadgeGrey">{ticket.id}</span>
                    </div>
                    <p className="platTicketTitle">{ticket.title}</p>
                    <p className="muted" style={{ margin: 0, fontSize: 12 }}>{ticket.home}</p>
                    <div className="platTicketMeta">
                      <span>Status: <strong>{ticket.status}</strong></span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* ── Enterprise controls ─────────────────────────────────── */}
            <div className="platCard" id="plat-enterprise">
              <div className="platCardHeader">
                <Layers size={14} strokeWidth={2.3} />
                <h3>Enterprise controls</h3>
                <span className="platBadge platBadgePurple" style={{ marginLeft: "auto" }}>Enterprise</span>
              </div>

              {/* Feature flag matrix */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Flag size={13} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Feature flag management</span>
                  <span className="platBadge platBadgeGrey" style={{ fontSize: 10 }}>per-home</span>
                </div>
                <div className="platTableWrap">
                  <table className="platTable" style={{ minWidth: 560 }}>
                    <colgroup>
                      <col style={{ width: "40%" }} />
                      <col style={{ width: "14%" }} />
                      {displaySubscribers.map((h) => <col key={h.id} style={{ width: `${46 / Math.max(displaySubscribers.length, 1)}%` }} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Required tier</th>
                        {displaySubscribers.map((h) => <th key={h.id} style={{ textAlign: "center" }}>{h.name.split(" ")[0]}</th>)}
                        {displaySubscribers.length === 0 && <th style={{ textAlign: "center" }}>Homes</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_FEATURES.map((feat) => (
                        <tr key={feat.key}>
                          <td style={{ fontWeight: 700, fontSize: 12 }}>{feat.label}</td>
                          <td><PlanBadge plan={feat.tier} /></td>
                          {displaySubscribers.map((home) => {
                            const planTier = home.plan.toLowerCase();
                            const tierOrder = { starter: 0, professional: 1, enterprise: 2 };
                            const featTierOrder = tierOrder[feat.tier] ?? 0;
                            const homeTierOrder = tierOrder[planTier as keyof typeof tierOrder] ?? 0;
                            const included = homeTierOrder >= featTierOrder;
                            const flagged = home.features[feat.key] ?? included;
                            return (
                              <td key={home.id} style={{ textAlign: "center", verticalAlign: "middle" }}>
                                {flagged
                                  ? <CheckCircle size={15} style={{ color: "#16a34a", display: "block", margin: "0 auto" }} />
                                  : <XCircle size={15} style={{ color: "#cbd5e1", display: "block", margin: "0 auto" }} />}
                              </td>
                            );
                          })}
                          {displaySubscribers.length === 0 && (
                            <td style={{ color: "var(--muted)", fontSize: 12, textAlign: "center" }}>—</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* API usage */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <BarChart3 size={13} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>API quota usage — current month</span>
                </div>
                <div className="platTableWrap">
                  <table className="platTable">
                    <colgroup>
                      <col style={{ width: "27%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "11%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Care home</th>
                        <th>Plan</th>
                        <th style={{ textAlign: "right" }}>Requests</th>
                        <th style={{ textAlign: "right" }}>Monthly limit</th>
                        <th>Usage</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiQuotas.map((row) => {
                        const pct = Math.round((row.requestsMonth / row.limit) * 100);
                        const urgent = pct >= 80;
                        return (
                          <tr key={row.home}>
                            <td><strong>{row.home}</strong></td>
                            <td><PlanBadge plan={row.plan} /></td>
                            <td className="platNumCell">{fmtNum(row.requestsMonth)}</td>
                            <td className="platNumCell">{fmtNum(row.limit)}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 999 }}>
                                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: urgent ? "#ef4444" : "#16a34a" }} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, color: urgent ? "#b91c1c" : "var(--muted)" }}>{pct}%</span>
                              </div>
                            </td>
                            <td>
                              {urgent
                                ? <span className="platBadge platBadgeRed">Near limit</span>
                                : <span className="platBadge platBadgeGreen">Healthy</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compliance tracker */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <FileCheck size={13} style={{ color: "var(--muted)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Platform compliance tracker</span>
                </div>
                <div className="platAlertList">
                  {complianceItems.map((item) => {
                    const cls = item.status === "compliant" ? "platAlertItem--resolved"
                      : item.status === "pending" ? "platAlertItem--warning"
                      : "platAlertItem--critical";
                    const icon = item.status === "compliant"
                      ? <CheckCircle size={14} className="platAlertIconGreen" />
                      : item.status === "pending"
                      ? <Clock size={14} className="platAlertIconAmber" />
                      : <AlertTriangle size={14} className="platAlertIconRed" />;
                    return (
                      <div key={item.label} className={`platAlertItem ${cls}`}>
                        {icon}
                        <div className="platAlertContent">
                          <p className="platAlertTitle">{item.label}</p>
                          <p className="platAlertDetail">{item.updated}</p>
                        </div>
                        <span className={`platBadge ${item.status === "compliant" ? "platBadgeGreen" : item.status === "pending" ? "platBadgeAmber" : "platBadgeRed"}`}>
                          {item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* ── Right rail ────────────────────────────────────────────── */}
          <div className="platRail">

            {/* MRR trend (billing) */}
            <div className="platCard" id="plat-billing">
              <div className="platCardHeader">
                <TrendingUp size={14} strokeWidth={2.3} />
                <h3>MRR trend</h3>
              </div>
              <div className="platRevenueSummary">
                <div className="platRevenueCurrent">
                  <span className="platRevenueFig">{fmtGbp(displayMrr)}</span>
                  <span className={`platRevenueChange ${mrrChange >= 0 ? "platRevenueUp" : "platRevenueDown"}`}>
                    {mrrChange >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                    {fmtGbp(Math.abs(mrrChange))} MoM
                  </span>
                </div>
                <div className="platRevenueStat">
                  <span>Active</span>
                  <strong>{displayActiveHomes} homes</strong>
                </div>
                <div className="platRevenueStat">
                  <span>Trial</span>
                  <strong>{displayTrialingHomes} homes</strong>
                </div>
              </div>
              <RevenueChart months={mrrMonths} />
            </div>

            {/* Active alerts */}
            <div className="platCard">
              <div className="platCardHeader">
                <Bell size={14} strokeWidth={2.3} />
                <h3>Active alerts</h3>
                {alerts.length > 0 && <span className="platCardCountRed">{alerts.length}</span>}
              </div>
              <div className="platAlertList">
                {alerts.length === 0 ? (
                  <div className="platAlertEmpty">
                    <CheckCircle size={16} className="platAlertIconGreen" />
                    <span>All clear — no active alerts</span>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className={`platAlertItem platAlertItem--${alert.severity}`}>
                      {alert.severity === "critical"
                        ? <XCircle size={14} className="platAlertIconRed" />
                        : <AlertTriangle size={14} className="platAlertIconAmber" />}
                      <div className="platAlertContent">
                        <p className="platAlertTitle">{alert.title}</p>
                        <p className="platAlertDetail">{alert.detail}</p>
                        {alert.service && <span className="platAlertTag">{alert.service}</span>}
                      </div>
                      <Clock size={11} className="platAlertIconGrey" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Onboarding queue */}
            <div className="platCard">
              <div className="platCardHeader">
                <CheckCircle size={14} strokeWidth={2.3} />
                <h3>Onboarding queue</h3>
                <span className="platCardCount">{onboardingRows.length}</span>
              </div>
              <div className="platAlertList">
                {onboardingRows.map((row) => (
                  <div key={row.home} className="platAlertItem platAlertItem--warning">
                    <AlertTriangle size={14} className="platAlertIconAmber" />
                    <div className="platAlertContent">
                      <p className="platAlertTitle">{row.home}</p>
                      <p className="platAlertDetail">{row.stage} · {row.plan}</p>
                      <span className="platAlertTag">{row.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform changelog — settings/release section */}
            <div className="platCard" id="plat-settings">
              <div className="platCardHeader">
                <Settings size={14} strokeWidth={2.3} />
                <h3>Platform changelog</h3>
              </div>
              <div className="platAlertList">
                {platformChangelog.map((entry) => (
                  <div key={entry.version} className={`platAlertItem ${entry.breaking ? "platAlertItem--warning" : "platAlertItem--info"}`}>
                    <div className="platAlertContent">
                      <p className="platAlertTitle">
                        v{entry.version}
                        {entry.breaking && <span className="platBadge platBadgeRed" style={{ marginLeft: 6, fontSize: 9 }}>breaking</span>}
                      </p>
                      <p className="platAlertDetail">{entry.summary}</p>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{entry.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth users */}
            <div className="platCard">
              <div className="platCardHeader">
                <ShieldCheck size={14} strokeWidth={2.3} />
                <h3>Auth users</h3>
                <span className="platCardCount">{(overview?.users ?? []).length}</span>
              </div>
              <div className="platAlertList">
                {(overview?.users ?? []).map((u) => (
                  <div key={u.id} className="platAlertItem platAlertItem--info">
                    <div className="platAlertContent">
                      <p className="platAlertTitle">{u.email}</p>
                      <p className="platAlertDetail">{u.role.replaceAll("_", " ")}</p>
                    </div>
                    <span className="platBadge platBadgeGrey">local</span>
                  </div>
                ))}
                {(overview?.users ?? []).length === 0 && !loading && (
                  <p className="muted" style={{ fontSize: 12, padding: "8px 0" }}>
                    No users returned from backend yet.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
