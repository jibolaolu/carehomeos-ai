import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import Link from "next/link";
import { incidents } from "../../lib/demo-data";

const incidentTimeline = {
  "INC-401": [
    ["09:12", "Fall observed beside bed, no head strike reported."],
    ["09:24", "Nurse assessment completed and neurological observations started."],
    ["10:05", "Family call attempted, voicemail left, RCA owner assigned."],
  ],
  "INC-402": [
    ["08:40", "Redness identified during morning personal care."],
    ["09:15", "Pressure-relief plan updated and skin integrity review booked."],
    ["11:00", "Senior review added to handover and care plan note flagged."],
  ],
} as const;

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ incident?: string }> }) {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/incidents");
  const params = await searchParams;
  const activeIncident = incidents.find((incident) => incident.id === params.incident) ?? incidents[0];
  const timeline = incidentTimeline[activeIncident.id as keyof typeof incidentTimeline] ?? [];

  return (
    <section className="stack incidentsPage">
      <div className="hero">
        <span className="badge warning">Incident learning</span>
        <h2 className="pageTitle">Incidents and follow-up actions</h2>
        <p className="pageLead">Track severity, root-cause analysis, family notification, action ownership, and closure readiness in one review flow.</p>
      </div>

      <section className="incidentLayout">
        <div className="incidentListStack">
          {incidents.map((incident) => (
            <Link className={`card incidentSummaryCard interactiveCard ${incident.id === activeIncident.id ? "active" : ""}`} href={`/incidents?incident=${incident.id}`} key={incident.id}>
              <div className="listItem compactListItem">
                <span className={incident.severity === "High" ? "badge danger" : "badge warning"}>{incident.severity}</span>
                <span className="badge">Open</span>
              </div>
              <h3>{incident.id}</h3>
              <p className="incidentTitle">{incident.type}</p>
              <p className="muted">Resident: {incident.resident}</p>
              <div className="incidentCardFooter">
                <span>{incident.status}</span>
                <span className="linkHint">Open details</span>
              </div>
            </Link>
          ))}
        </div>

        <aside className="card incidentDetailCard">
          <div className="incidentDetailHeader">
            <div>
              <span className={activeIncident.severity === "High" ? "badge danger" : "badge warning"}>{activeIncident.severity} priority</span>
              <h3>{activeIncident.id}: {activeIncident.type}</h3>
              <p className="muted">Resident: {activeIncident.resident}</p>
            </div>
            <span className="badge success">Follow-up live</span>
          </div>

          <div className="incidentMetaGrid">
            <div><span className="metricLabel">Current status</span><strong>{activeIncident.status}</strong></div>
            <div><span className="metricLabel">Family update</span><strong>Pending call outcome</strong></div>
            <div><span className="metricLabel">Root cause review</span><strong>{activeIncident.severity === "High" ? "In progress" : "Booked"}</strong></div>
            <div><span className="metricLabel">Manager owner</span><strong>Ruth Manager</strong></div>
          </div>

          <div className="incidentNarrative">
            <h4 className="sectionTitle">Action timeline</h4>
            <div className="incidentTimeline">
              {timeline.map(([time, note]) => (
                <div className="incidentTimelineRow" key={`${activeIncident.id}-${time}`}>
                  <strong>{time}</strong>
                  <p className="muted">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </section>
  );
}
