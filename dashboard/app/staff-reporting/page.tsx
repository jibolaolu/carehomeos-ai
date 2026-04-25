import Link from "next/link";

const reportingTypes = [
  "Care note",
  "Incident",
  "Falls observation",
  "Nutrition and hydration",
  "Medication concern",
  "Family update draft",
];

export default function StaffReportingPage() {
  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Staff reporting</p>
          <h1 className="pageTitle">Care staff reporting entry</h1>
          <p className="pageLead">
            This is the dashboard-side local entry for staff who usually work from the mobile app. It lets you test the reporting role, AI drafting route, and escalation workflow without switching devices.
          </p>
        </div>
        <Link className="btn primary" href="/dashboard">Back to dashboard</Link>
      </section>

      <section className="grid">
        {reportingTypes.map((type) => (
          <article className="card" key={type}>
            <span className="badge">{type}</span>
            <h2 className="sectionTitle">Create {type.toLowerCase()}</h2>
            <p className="muted">Routes through the staff reporting role and can call the AI completion endpoint for drafting, CQC tagging, and escalation prompts.</p>
          </article>
        ))}
      </section>

      <section className="notice">
        <strong>Local demo credential</strong>
        <p>Use <code>staff@oakfield.local</code> with password <code>CareHomeOS!2026</code>. Mobile web runs on port 19015 when started by the local script.</p>
      </section>
    </div>
  );
}

