import Link from "next/link";
import {
  ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Activity,
  Users, Pill, AlertTriangle, BarChart2, Mic, Crown,
} from "lucide-react";
import { careHomes, plans } from "../lib/demo-data";

const proofStats = [
  ["30+", "Pages and workflows"],
  ["7", "Role-based journeys"],
  ["AI-first", "Voice-to-CQC notes"],
  ["CQC-ready", "Evidence scoring"],
];

const featureCards = [
  {
    icon: Mic,
    title: "AI care notes",
    description: "Staff speak — CareHomeOS structures. Voice notes are transcribed and routed through CQC context, falls tagging, and multilingual translation.",
    tint: "nhsIconTeal",
  },
  {
    icon: Activity,
    title: "Clinical oversight",
    description: "NEWS2 vitals, wound mapping, fluid balance, and end-of-life care — all tracked per resident with escalation logic built in.",
    tint: "nhsIconBlue",
  },
  {
    icon: Pill,
    title: "eMAR medication",
    description: "Medication administration records updated in real time. Due, administered, and missed doses visible across all residents at a glance.",
    tint: "nhsIconGreen",
  },
  {
    icon: AlertTriangle,
    title: "Incident management",
    description: "Log, track, and review incidents with RCA tools. Severity scoring, open/closed states, and a full audit trail for CQC evidence.",
    tint: "nhsIconAmber",
  },
  {
    icon: BarChart2,
    title: "CQC readiness",
    description: "Evidence score per key question. Policy gaps, inspection dates, and action plans surface automatically. CQC-PIR export ready.",
    tint: "nhsIconPurple",
  },
  {
    icon: Users,
    title: "Staff and rota",
    description: "Rota planning, training compliance, and staffing ratios. Staff reporting app gives carers a mobile-first experience for every shift.",
    tint: "nhsIconIndigo",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Care staff report",
    body: "Carers use voice notes or the staff reporting app to capture shift observations, nutrition, hydration, mobility, and incidents.",
  },
  {
    step: "02",
    title: "AI structures the note",
    body: "Multi-LLM routing drafts a CQC-compliant care note with tags, escalation prompts, and quality gating. Local fallback if AI keys are absent.",
  },
  {
    step: "03",
    title: "Admin reviews and approves",
    body: "Care home managers see the structured note, approve or escalate, and confirm any actions needed — all from the dashboard.",
  },
];


export default function LandingPage() {
  const activeHomes = careHomes.filter((h) => h.status === "Active" || h.status === "Trialing").length;

  return (
    <div className="nhsPage">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="nhsNav">
        <div className="nhsNavInner">
          <Link href="/" className="nhsNavBrand">
            <span className="nhsNavLogoMark">CH</span>
            <span>CareHome<strong>OS</strong></span>
          </Link>
          <nav className="nhsNavLinks">
            <a href="#workflow">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login">Sign in</Link>
            <Link className="btn primary" href="/login">Get started</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="nhsHero">
          <div className="nhsHeroGrid" />
          <div className="nhsHeroInner">
            <div className="nhsHeroCopy">
              <div className="nhsPill">
                <Sparkles size={13} />
                UK care home operating system · CQC-ready AI workflow
              </div>
              <h1 className="nhsH1">
                Run care delivery, compliance, and oversight from one{" "}
                <span className="nhsGradient">intelligent platform</span>
              </h1>
              <p className="nhsHeroLead">
                CareHomeOS brings resident records, staff reporting, AI-structured care notes,
                clinical monitoring, eMAR, incident management, and CQC evidence into one
                purpose-built operating system for UK care homes.
              </p>
              <div className="nhsHeroActions">
                <Link href="/login" className="nhsBtnPrimary">
                  Sign in to CareHomeOS
                  <ArrowRight size={16} />
                </Link>
                <a href="#features" className="nhsBtnSecondary">See all features</a>
              </div>
              <div className="nhsChecklist">
                {["Auth0 role-based access", "Voice-to-CQC notes", "Multi-LLM routing", "NEWS2 clinical monitoring"].map((item) => (
                  <span key={item} className="nhsCheckItem">
                    <CheckCircle2 size={14} className="nhsCheckIcon" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero preview card */}
            <div className="nhsHeroCard">
              <div className="nhsHeroCardTop">
                <div>
                  <p className="eyebrow">Care home dashboard</p>
                  <h2 className="nhsHeroCardTitle">Oakfield House</h2>
                </div>
                <div className="nhsHeroCardScore">
                  <span>CQC score</span>
                  <strong>87%</strong>
                </div>
              </div>
              <div className="nhsHeroMetrics">
                {[
                  ["Residents", "12", "4 high-risk"],
                  ["Medication", "9/12", "3 still due"],
                  ["Open incidents", "3", "RCA in progress"],
                  ["Active homes", String(activeHomes), "across the platform"],
                ].map(([label, value, sub]) => (
                  <div key={label} className="nhsHeroMetric">
                    <span className="nhsHeroMetricLabel">{label}</span>
                    <strong className="nhsHeroMetricValue">{value}</strong>
                    <span className="nhsHeroMetricSub">{sub}</span>
                  </div>
                ))}
              </div>
              <div className="nhsHeroVoiceCard">
                <span>AI note quality gate</span>
                <div className="nhsWaveBars">
                  {[38, 58, 44, 72, 52, 80, 45, 66, 50].map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <p>Resident alert, responsive. Fluids accepted after prompting. Family update draft ready.</p>
              </div>

              <div className="nhsHeroCardBottom">
                <div className="nhsHeroCardPanel">
                  <span className="nhsHeroCardPanelLabel">Parent / family access</span>
                  <p>Plain-English updates from approved care notes, not clinical records.</p>
                </div>
                <div className="nhsHeroCardPanel nhsHeroCardPanelDark">
                  <div className="nhsHeroCardEnterprise">
                    <Crown size={13} />
                    Enterprise
                  </div>
                  <p>Multi-home group oversight and portfolio-level reporting for care groups.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Proof stats ──────────────────────────────────────── */}
        <div className="nhsStatsBar">
          {proofStats.map(([value, label]) => (
            <div key={label} className="nhsStat">
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Workflow ─────────────────────────────────────────── */}
        <section id="workflow" className="nhsDarkSection">
          <div className="nhsSectionInner">
            <div className="nhsSectionIntro nhsSectionIntroDark">
              <p className="nhsSectionLabel" style={{ color: "#60a5fa" }}>CareHomeOS workflow</p>
              <h2>From care report to reviewed evidence in minutes</h2>
              <p>A single staff voice note becomes a CQC-compliant structured record, reviewed and approved, before the shift ends.</p>
            </div>
            <div className="nhsWorkflowGrid">
              {workflowSteps.map((item) => (
                <div key={item.step} className="nhsWorkflowCard">
                  <div className="nhsWorkflowNum">{item.step}</div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section id="features" className="nhsSection">
          <div className="nhsSectionInner">
            <div className="nhsSectionIntro">
              <p className="nhsSectionLabel">Built for modern care homes</p>
              <h2>Everything a care provider needs to run safer daily operations</h2>
              <p>Designed for care home admins, deputy managers, care staff, families, and platform operators.</p>
            </div>
            <div className="nhsFeatureGrid">
              {featureCards.map((card) => (
                <div key={card.title} className="nhsFeatureCard">
                  <div className={`nhsFeatureIcon ${card.tint}`}>
                    <card.icon size={20} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compliance / risk callout ─────────────────────────── */}
        <section className="nhsSection" style={{ background: "#f8fafc" }}>
          <div className="nhsSectionInner">
            <div className="nhsRiskPanel">
              <div>
                <p className="nhsSectionLabel">AI routing and CQC evidence</p>
                <h2>Proactive risk detection that keeps running even without AI keys</h2>
                <p>OpenAI, Anthropic, Gemini, and a deterministic local fallback are wired so the full workflow runs during development and in production.</p>
                <ul className="nhsBulletList">
                  <li>Care note and family update drafting</li>
                  <li>Falls, deterioration, and CQC evidence prompts</li>
                  <li>DeepL-supported multilingual voice notes</li>
                </ul>
              </div>
              <div className="nhsRiskCard">
                <span className="nhsRiskLabel">High priority alert</span>
                <p className="nhsRiskTitle">Pressure care follow-up due</p>
                <div className="nhsRiskBar" />
                <Link className="btn primary" href="/staff-reporting">Review report</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────── */}
        <section id="pricing" className="nhsSection">
          <div className="nhsSectionInner">
            <div className="nhsSectionIntro">
              <p className="nhsSectionLabel" style={{ color: "#4338ca" }}>Pricing plans</p>
              <h2>Simple plans for every care home</h2>
              <p>Use these plans to test care-home onboarding, admin limits, trial status, and billing flows in the local environment.</p>
            </div>
            <div className="nhsPricingGrid">
              {plans.map((plan) => (
                <article key={plan.id} className={plan.highlight ? "nhsPricingCard nhsPricingCardHighlight" : "nhsPricingCard"}>
                  {plan.highlight && <div className="nhsPricingBadge">Most popular</div>}
                  <h3>{plan.name}</h3>
                  <div className="nhsPricingPrice">
                    <span>£</span>{plan.price}
                    <small>/month</small>
                  </div>
                  <p className="nhsPricingMeta">{plan.limit} · {plan.admins}</p>
                  <ul className="nhsPricingList">
                    {plan.features.map((f) => (
                      <li key={f}>
                        <CheckCircle2 size={14} className="nhsCheckIcon" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link className={plan.highlight ? "btn primary" : "btn"} href={`/plans?selected=${plan.id}`}>
                    View plan
                    <ArrowRight size={13} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security / dark section ───────────────────────────── */}
        <section className="nhsDarkSection nhsSecuritySection">
          <div className="nhsSectionInner">
            <div className="nhsSecurityGrid">
              <div>
                <div className="nhsSecurityPill">
                  <ShieldCheck size={13} />
                  Designed for regulated care environments
                </div>
                <h2 style={{ color: "#fff" }}>Security and compliance are part of the product, not an afterthought</h2>
                <p style={{ color: "#94a3b8" }}>
                  CareHomeOS is designed for sensitive resident data, operational auditability, and CQC inspection readiness from day one.
                </p>
                <div className="nhsSecurityPoints">
                  {["Auth0-backed identity and RBAC", "httpOnly cookie sessions, no localStorage secrets", "CQC evidence audit trail built in", "Middleware-enforced route guards on every page"].map((point) => (
                    <div key={point} className="nhsSecurityPoint">
                      <CheckCircle2 size={14} />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
              <div className="nhsSecurityCards">
                {[
                  { title: "Access control", body: "Role-based route guards enforced in Next.js middleware and per-page server components. Staff, admin, and platform roles are fully isolated." },
                  { title: "Session management", body: "httpOnly cookie authentication via Auth0 or local dev flow. Sign-out clears all browser state and server-side cookies simultaneously." },
                  { title: "Data governance", body: "Care notes, incidents, and resident records are scoped to care home ID. Platform admins see only aggregated cross-home data." },
                ].map((card) => (
                  <div key={card.title} className="nhsSecurityCard">
                    <h4>{card.title}</h4>
                    <p>{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="nhsSection">
          <div className="nhsCtaBlock">
            <h2>Ready to run a full CareHomeOS role journey?</h2>
            <p>Start the backend and dashboard, then work through each role: care staff → deputy manager → registered manager → platform admin.</p>
            <div className="nhsCtaActions">
              <Link className="nhsBtnPrimary" href="/login">
                Sign in to CareHomeOS
                <ArrowRight size={16} />
              </Link>
              <a href="#features" className="nhsBtnSecondary">
                Explore features
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="nhsFooter">
        <div className="nhsFooterInner">
          <div className="nhsFooterBrand">
            <span className="nhsNavLogoMark">CH</span>
            <span>CareHomeOS</span>
          </div>
          <p className="nhsFooterNote">
            © {new Date().getFullYear()} CareHomeOS · UK care home operating system for delivery, compliance, and CQC evidence.
          </p>
          <div className="nhsFooterLinks">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#security">Security</a>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
