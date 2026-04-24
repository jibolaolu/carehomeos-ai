"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { careHomes as fallbackHomes, plans as fallbackPlans } from "../../lib/demo-data";
import { normalizeRole } from "../../lib/rbac";

type SessionSummary = {
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  adminLevel?: string | null;
  platformScope?: string | null;
};

type BillingPlan = {
  id: string;
  name: string;
  price_gbp?: number;
  price?: string;
  resident_limit?: number | string;
  admin_limit?: number | string;
  limit?: string;
  admins?: string;
  features: string[];
  highlight?: boolean;
};

type SubscriptionSnapshot = {
  care_home: {
    id: string;
    name: string;
    provider: string;
    plan: string;
    subscription_status?: string;
    residents?: number;
    admins?: number;
    monthly_value_gbp?: number;
  };
  plan: BillingPlan;
  usage: { residents: number; admins: number };
  limits: { residents: number | null; admins: number | null };
  remaining: { residents: number | null; admins: number | null };
  feature_flags: Record<string, boolean>;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";
const fallbackHome = fallbackHomes[0];
const fallbackCurrentPlan = fallbackPlans.find((plan) => plan.name === fallbackHome.plan) ?? fallbackPlans[0];

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

function formatPrice(plan: BillingPlan) {
  if (typeof plan.price_gbp === "number") return `GBP ${plan.price_gbp.toLocaleString()}`;
  return plan.price ?? "GBP 0";
}

function formatLimit(value: number | string | null | undefined, fallback: string) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return `${value}`;
  return value;
}

export default function PlansClient({ initialUser }: { initialUser?: SessionSummary | null }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionSummary | null>(() => initialUser ?? null);
  const [authChecked, setAuthChecked] = useState(Boolean(initialUser));
  const [plans, setPlans] = useState<BillingPlan[]>(fallbackPlans as BillingPlan[]);
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>({
    care_home: {
      id: fallbackHome.id,
      name: fallbackHome.name,
      provider: fallbackHome.provider,
      plan: fallbackCurrentPlan.id,
      subscription_status: fallbackHome.status?.toLowerCase(),
      residents: fallbackHome.residents,
      admins: fallbackHome.admins,
      monthly_value_gbp: Number(fallbackHome.mrr.replace(/[^0-9]/g, "")),
    },
    plan: fallbackCurrentPlan as BillingPlan,
    usage: { residents: fallbackHome.residents, admins: fallbackHome.admins },
    limits: { residents: 90, admins: 8 },
    remaining: { residents: 47, admins: 6 },
    feature_flags: { finance_exports: true, ai_note_quality_gate: true, rota_gap_alerts: true, multilingual_voice_notes: true },
  });
  const [message, setMessage] = useState("Subscription logic is live: plan changes now update backend state and limits.");
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const cookieUser = readCookieSummary();
    if (cookieUser) {
      setSession(cookieUser);
      window.localStorage.setItem("carehomeos.user", JSON.stringify(cookieUser));
      setAuthChecked(true);
    } else if (!initialUser) {
      const raw = window.localStorage.getItem("carehomeos.user");
      if (raw) {
        try {
          setSession(JSON.parse(raw) as SessionSummary);
          setAuthChecked(true);
        } catch {
          window.localStorage.removeItem("carehomeos.user");
        }
      }
    }

    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.user) {
          setSession(payload.user);
          setAuthChecked(true);
        }
      })
      .catch(() => undefined)
      .finally(() => setAuthChecked(true));
  }, [initialUser]);

  const role = normalizeRole(session);

  useEffect(() => {
    if (!authChecked) return;
    if (role === "sub_admin") router.replace("/dashboard");
    if (role === "staff") router.replace("/staff-reporting");
  }, [authChecked, role, router]);

  useEffect(() => {
    if (role === "super_admin") return;

    async function loadBillingData() {
      try {
        const [plansResponse, subscriptionResponse] = await Promise.all([
          fetch(`${apiBase}/billing/plans`, { cache: "no-store" }),
          fetch(`${apiBase}/billing/subscription?care_home_id=home-oakfield`, { cache: "no-store" }),
        ]);
        if (plansResponse.ok) {
          setPlans((await plansResponse.json()) as BillingPlan[]);
        }
        if (subscriptionResponse.ok) {
          setSubscription((await subscriptionResponse.json()) as SubscriptionSnapshot);
        }
      } catch {
        // keep local fallback for preview mode
      }
    }

    loadBillingData();
  }, [role]);

  async function selectPlan(planId: string) {
    setUpdatingPlanId(planId);
    setMessage("Updating subscription plan...");
    try {
      const response = await fetch(`${apiBase}/billing/checkout-session?care_home_id=home-oakfield&plan_id=${planId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = await response.json();
      if (payload.subscription) {
        setSubscription(payload.subscription as SubscriptionSnapshot);
      }
      setMessage(`Plan updated to ${planId}. Limits and feature flags are now applied from the backend.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update plan.");
    } finally {
      setUpdatingPlanId(null);
    }
  }

  const currentHome = subscription?.care_home ?? {
    id: fallbackHome.id,
    name: fallbackHome.name,
    provider: fallbackHome.provider,
    plan: fallbackCurrentPlan.id,
    subscription_status: "trialing",
    residents: fallbackHome.residents,
    admins: fallbackHome.admins,
    monthly_value_gbp: Number(fallbackHome.mrr.replace(/[^0-9]/g, "")),
  };

  const currentPlan = subscription?.plan ?? fallbackCurrentPlan;

  const planMix = useMemo(() => {
    if (role !== "super_admin") return [] as BillingPlan[];
    return plans;
  }, [plans, role]);

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
    return (
      <div className="stack">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Platform subscriptions</p>
            <h2 className="pageTitle">CareHomeOS subscription control</h2>
            <p className="pageLead">Platform admins can review live plan assignments, feature availability, and care-home usage against plan limits.</p>
          </div>
          <Link className="btn primary" href="/platform-admin">Platform overview</Link>
        </div>
        <section className="tableWrap">
          <table>
            <thead><tr><th>Plan</th><th>Residents</th><th>Admins</th><th>Core features</th></tr></thead>
            <tbody>
              {planMix.map((plan) => (
                <tr key={plan.id}>
                  <td><strong>{plan.name}</strong><br /><span className="muted">{formatPrice(plan)}</span></td>
                  <td>{formatLimit(plan.resident_limit, plan.limit ?? "Unlimited")}</td>
                  <td>{formatLimit(plan.admin_limit, plan.admins ?? "Unlimited")}</td>
                  <td><span className="muted">{plan.features.slice(0, 2).join(" · ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <p className="pageLead">Care home admins can review the active subscription, plan limits, trial status, and upgrade path before unlocking more residents, admins, and automation.</p>
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
            <p className="metricValue">{currentPlan.name}</p>
            <span className={currentHome.subscription_status === "active" ? "badge success" : "badge warning"}>{currentHome.subscription_status ?? "trialing"}</span>
          </div>
          <div>
            <p className="metricLabel">Monthly recurring revenue</p>
            <p className="metricValue">GBP {currentHome.monthly_value_gbp ?? 0}</p>
            <p className="muted">{subscription?.usage.residents ?? currentHome.residents ?? 0} residents and {subscription?.usage.admins ?? currentHome.admins ?? 0} admins in use</p>
          </div>
          <div>
            <p className="metricLabel">Remaining capacity</p>
            <p className="metricValue">{subscription?.remaining.residents ?? "-"}</p>
            <p className="muted">Residents left on current plan · admins left {subscription?.remaining.admins ?? "-"}</p>
          </div>
        </div>
      </section>

      <div className="notice">
        <strong>Plan enforcement is active</strong>
        <p>{message}</p>
      </div>

      <section className="grid">
        {plans.map((plan) => {
          const active = currentPlan.id === plan.id;
          return (
            <article key={plan.id} className={`planCard ${plan.highlight ? "highlight" : ""}`}>
              <div>
                <span className={active ? "badge success" : plan.highlight ? "badge" : "badge success"}>{active ? "Current" : plan.highlight ? "Recommended" : "Available"}</span>
                <h3>{plan.name}</h3>
                <p className="price">{formatPrice(plan)}</p>
                <p className="muted">per care home, per month</p>
              </div>
              <div className="actions">
                <span className="badge">{formatLimit(plan.resident_limit, plan.limit ?? "Unlimited")} residents</span>
                <span className="badge">{formatLimit(plan.admin_limit, plan.admins ?? "Unlimited")} admins</span>
              </div>
              <ul className="list">
                {plan.features.map((feature) => (
                  <li className="listItem" key={feature}><span>{feature}</span><span className="badge success">Included</span></li>
                ))}
              </ul>
              <button className={active ? "btn" : "btn primary"} type="button" onClick={() => selectPlan(plan.id)} disabled={active || updatingPlanId === plan.id}>
                {active ? "Current plan" : updatingPlanId === plan.id ? "Updating..." : `Select ${plan.name}`}
              </button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
