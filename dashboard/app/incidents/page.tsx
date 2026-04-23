import { incidents } from "../../lib/demo-data";

export default function IncidentsPage() {
    return (
        <section className="stack">
            <div className="hero">
                <span className="badge warning">Incident learning</span>
                <h2 className="pageTitle">Incidents and follow-up actions</h2>
                <p className="pageLead">Track severity, root-cause analysis, family notification, and action completion.</p>
            </div>
            <div className="grid">
                {incidents.map((incident) => (
                    <div className="card" key={incident.id}>
                        <span className={incident.severity === "High" ? "badge danger" : "badge warning"}>{incident.severity}</span>
                        <h3>{incident.id}: {incident.type}</h3>
                        <p className="muted">{incident.resident}</p>
                        <p>{incident.status}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
