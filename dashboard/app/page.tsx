import Link from "next/link";
import { careHomes, finance, plans } from "../lib/demo-data";

const demoPassword = "CareHomeOS!2026";

const features = [
  ["AI care notes", "Voice-to-note drafting with CQC tags, escalation prompts, and multilingual translation metadata."],
  ["Clinical oversight", "Resident risk, eMAR visibility, incidents, falls, deterioration, and care-plan review in one place."],
  ["Family communication", "Plain-English family updates generated from approved care activity and resident status."],
  ["Subscriptions", "Plan limits, trial status, billing state, and care-home onboarding for local end-to-end testing."],
  ["Staff reporting", "Mobile-first reporting for care notes, incidents, nutrition, hydration, and medication concerns."],
  ["Platform control", "CareHomeOS company admins manage homes, plans, support, infrastructure, and audit readiness."],
];

const workflow = [
  ["01", "Staff records", "Care staff capture notes from the mobile app or staff reporting page."],
  ["02", "AI structures", "Multi-LLM routing drafts the note, applies CQC context, and falls back locally if keys are absent."],
  ["03", "Admin reviews", "Care home admins and assistant managers approve, escalate, and track follow-up."],
  ["04", "Evidence ready", "Families, audits, finance, and CQC views receive clean operational records."],
];

const signInOptions = [
  {
    label: "Care home admin",
    caption: "Registered manager / home superuser",
    email: "manager@oakfield.local",
    href: "/login?email=manager@oakfield.local",
  },
  {
    label: "Assistant manager",
    caption: "Sub admin for a specific care home",
    email: "deputy@oakfield.local",
    href: "/login?email=deputy@oakfield.local",
  },
  {
    label: "Staff reporting",
    caption: "Care staff using the reporting app",
    email: "staff@oakfield.local",
    href: "/login?email=staff@oakfield.local",
  },
  {
    label: "CareHomeOS super admin",
    caption: "Company platform staff only",
    email: "superadmin@carehomeos.local",
    href: "/login?email=superadmin@carehomeos.local",
  },
];

export default function LandingPage() {
  const activeHomes = careHomes.filter((home) => home.status === "Active" || home.status === "Trialing").length;

  return (
    <div className="marketingPage">
      <header className="marketingNav">
        <Link href="/" className="marketingLogo">
          <span className="marketingLogoMark">CH</span>
          <span>Care<span>HomeOS</span></span>
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#pricing">Pricing</a>
          <Link href="/login">Care home login</Link>
          <Link href="/platform-admin">Company admin</Link>
        </nav>
      </header>

      <main>
        <section className="marketingHero">
          <div className="marketingHeroCopy">
            <span className="marketingBadge">UK care home operations &middot; CQC-ready AI workflow</span>
            <h1>Care homes, intelligently managed.</h1>
            <p>
              CareHomeOS brings resident records, staff reporting, AI care notes, family communication,
              subscriptions, and platform oversight into one local testing experience.
            </p>
            <div className="marketingActions">
              <Link className="btn primary" href="/login?email=manager@oakfield.local">Start care home test</Link>
              <a className="btn" href="#signin">Choose role</a>
            </div>
            <div className="trustLine">
              <span>Local demo</span>
              <span>Multi-LLM ready</span>
              <span>DeepL voice-note translation</span>
            </div>
          </div>

          <div className="heroPreview" aria-label="CareHomeOS dashboard preview">
            <div className="heroPreviewTop">
              <span>Live care home view</span>
              <strong>Oakfield House</strong>
            </div>
            <div className="heroPreviewBlue">
              <span>AI note quality gate</span>
              <div className="waveBars">
                {["38", "58", "44", "72", "52", "80", "45", "66", "50"].map((height, index) => (
                  <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
                ))}
              </div>
              <p>Resident alert, responsive. Fluids accepted after prompting. Family update draft ready.</p>
            </div>
            <div className="heroPreviewGrid">
              <div><span>Occupancy</span><strong>{finance.occupancy}</strong></div>
              <div><span>Active homes</span><strong>{activeHomes}</strong></div>
              <div><span>AI route</span><strong>Claude + GPT</strong></div>
              <div><span>CQC score</span><strong>87%</strong></div>
            </div>
          </div>
        </section>

        <section id="workflow" className="darkWorkflow">
          <div className="sectionIntro dark">
            <span>CareHomeOS workflow</span>
            <h2>From care report to reviewed evidence in minutes</h2>
          </div>
          <div className="workflowGrid">
            {workflow.map(([step, title, copy]) => (
              <article key={step}>
                <div>{step}</div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="marketingSection">
          <div className="sectionIntro">
            <span>Built for modern care homes</span>
            <h2>Everything a provider needs to run safer daily operations</h2>
            <p>Designed for care-home admins, assistant managers, care staff, families, and CareHomeOS company operations.</p>
          </div>
          <div className="featureGrid">
            {features.map(([title, copy]) => (
              <article key={title}>
                <span className="featureIcon">{title.slice(0, 2).toUpperCase()}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="riskPanel">
          <div>
            <span>AI routing and risk escalation</span>
            <h2>Proactive detection without blocking local tests</h2>
            <p>OpenAI, Anthropic, Gemini, and deterministic local fallback are wired so the full workflow keeps running while keys are configured.</p>
            <ul>
              <li>Care note and family update drafting</li>
              <li>Falls, deterioration, and CQC evidence prompts</li>
              <li>DeepL-supported multilingual voice notes</li>
            </ul>
          </div>
          <div className="riskCard">
            <span>High priority alert</span>
            <p>Pressure care follow-up due</p>
            <div />
            <Link className="btn primary" href="/staff-reporting">Review report</Link>
          </div>
        </section>

        <section id="pricing" className="marketingSection pricingSection">
          <div className="sectionIntro">
            <span>Pricing plans</span>
            <h2>Simple plans for local subscription testing</h2>
            <p>Use these plans to test care-home onboarding, admin limits, trial status, and billing flows.</p>
          </div>
          <div className="marketingPlanGrid">
            {plans.map((plan) => (
              <article className={plan.highlight ? "marketingPlan selected" : "marketingPlan"} key={plan.id}>
                {plan.highlight ? <b>Recommended</b> : null}
                <h3>{plan.name}</h3>
                <p className="marketingPrice">{plan.price}<span>/month</span></p>
                <small>{plan.limit} &middot; {plan.admins}</small>
                <ul>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <Link className={plan.highlight ? "btn primary" : "btn"} href={`/plans?selected=${plan.id}`}>View plan</Link>
              </article>
            ))}
          </div>
        </section>

        <section id="signin" className="marketingSection signinSection">
          <div className="sectionIntro">
            <span>Local sign in</span>
            <h2>Choose the role you want to test</h2>
            <p>CareHomeOS super admin is company platform staff. It is separate from care-home admin and assistant manager access.</p>
          </div>
          <div className="signinGrid">
            {signInOptions.map((option) => (
              <article key={option.email}>
                <h3>{option.label}</h3>
                <p>{option.caption}</p>
                <code>{option.email}</code>
                <small>Password: {demoPassword}</small>
                <Link className="btn primary" href={option.href}>Local sign in</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="finalCta">
          <h2>Ready to test CareHomeOS properly?</h2>
          <p>Start the backend, dashboard, staff mobile app, and proxy, then run the role-based journey from this page.</p>
          <div>
            <Link className="btn primary" href="/admin/users">Create test users</Link>
            <Link className="btn" href="/platform-admin">Open company admin</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
