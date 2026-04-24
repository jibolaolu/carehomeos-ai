import Link from "next/link";
import { redirect } from "next/navigation";
import RoleDashboardControls from "../../components/dashboard/RoleDashboardControls";
import { createSessionSummary, getAuthSession } from "../../lib/auth-session";
import { careNotes, cqc, incidents, marRound, residents, staff } from "../../lib/demo-data";
import { normalizeRole } from "../../lib/rbac";

export default async function DashboardPage() {
    const session = await getAuthSession();
    if (!session) {
        redirect("/login?returnTo=/dashboard");
    }
    const role = normalizeRole(session);
    if (role === "super_admin") {
        redirect("/platform-admin");
    }
    if (role === "staff") {
        redirect("/staff-reporting");
    }

    const highRiskResidents = residents.filter((resident) => resident.fallsRisk === "High" || resident.deterioration === "High");
    const dueMeds = marRound.filter((round) => round.status === "Due");
    const avgCqc = Math.round(cqc.reduce((sum, item) => sum + item.score, 0) / cqc.length);
    const completedMeds = marRound.filter((round) => round.status === "Administered").length;
    const pendingNotes = careNotes.filter((note) => note.route !== "AUTO_FILE").length;

    return (
        <div className="dashboardGrid">
            <div className="mainPanel">
                <div className="pageHeader">
                    <div>
                        <p className="eyebrow">Dashboard</p>
                        <h2 className="pageTitle">Care home operating statistics</h2>
                        <p className="pageLead">A calm, scannable view of resident risk, eMAR progress, care-note routing, staffing, and CQC readiness.</p>
                    </div>
                    <RoleDashboardControls initialUser={createSessionSummary(session)} />
                </div>

                <section className="metrics">
                    <Link className="metricTile interactiveCard" href="/residents">
                        <div><p className="metricLabel">Residents</p><div className="metricValue">{residents.length}</div><p className="muted">Live local data</p></div>
                        <div className="metricIcon blue">R</div>
                    </Link>
                    <Link className="metricTile interactiveCard" href="/residents?risk=high">
                        <div><p className="metricLabel">High-risk reviews</p><div className="metricValue">{highRiskResidents.length}</div><p className="muted">Needs senior review</p></div>
                        <div className="metricIcon yellow">!</div>
                    </Link>
                    <Link className="metricTile interactiveCard" href="/mar?status=due">
                        <div><p className="metricLabel">eMAR completed</p><div className="metricValue">{completedMeds}</div><p className="muted">{dueMeds.length} still due</p></div>
                        <div className="metricIcon green">M</div>
                    </Link>
                    <Link className="metricTile interactiveCard" href="/cqc">
                        <div><p className="metricLabel">CQC readiness</p><div className="metricValue">{avgCqc}%</div><p className="muted">Evidence score</p></div>
                        <div className="metricIcon purple">C</div>
                    </Link>
                    <Link className="metricTile interactiveCard" href="/staff-reporting?route=pending">
                        <div><p className="metricLabel">Care notes pending</p><div className="metricValue">{pendingNotes}</div><p className="muted">Quality route</p></div>
                        <div className="metricIcon red">N</div>
                    </Link>
                </section>

                <section className="chartGrid">
                    <Link className="card chartCard interactiveCard" href="/cqc">
                        <h3 className="sectionTitle">CQC evidence overview</h3>
                        <div className="barChart" aria-label="CQC evidence bar chart">
                            {cqc.map((item) => <span key={item.key} className="bar" style={{ height: `${Math.max(18, item.score * 1.4)}px` }} />)}
                        </div>
                    </Link>
                    <Link className="card chartCard interactiveCard" href="/incidents">
                        <h3 className="sectionTitle">Risk volume</h3>
                        <div className="lineChart" aria-label="Risk volume line chart" />
                    </Link>
                </section>

                <section className="tableWrap">
                    <table>
                        <thead>
                            <tr><th>Resident</th><th>Latest note</th><th>Route</th><th>CQC tags</th></tr>
                        </thead>
                        <tbody>
                            {careNotes.map((note) => {
                                const resident = residents.find((item) => item.name === note.resident);
                                const href = resident ? `/residents/${resident.id}` : "/staff-reporting";
                                return (
                                    <tr key={note.resident + note.type} className="clickableRow">
                                        <td><Link href={href}><strong>{note.resident}</strong><br /><span className="muted">{note.type}</span></Link></td>
                                        <td><Link href={href}>{note.summary}</Link></td>
                                        <td><Link href={href}><span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{note.route} {note.confidence}</span></Link></td>
                                        <td><Link href={href}>{note.tags.join(", ")}</Link></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>

                <section className="grid">
                    <div className="card">
                        <h3 className="sectionTitle">Shift cover</h3>
                        <ul className="list">
                            {staff.slice(0, 4).map((member) => (
                                <li key={member.name}>
                                    <Link className="listItem interactiveListItem" href="/rota">
                                        <span><strong>{member.name}</strong><br /><span className="muted">{member.role}</span></span>
                                        <span className="badge">{member.shift}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="card">
                        <h3 className="sectionTitle">Incident review</h3>
                        <ul className="list">
                            {incidents.map((incident) => (
                                <li key={incident.id}>
                                    <Link className="listItem interactiveListItem" href="/incidents">
                                        <span><strong>{incident.type}</strong><br /><span className="muted">{incident.resident}</span></span>
                                        <span className={incident.severity === "High" ? "badge danger" : "badge warning"}>{incident.status}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>

            <aside className="rightRail">
                <div className="railHeader">
                    <div>
                        <h3 className="railTitle">Newest alerts</h3>
                        <p className="muted">Clinical and compliance feed</p>
                    </div>
                    <span className="badge danger">Live</span>
                </div>
                {highRiskResidents.map((resident) => (
                    <Link className="railItem interactiveRailItem" href={`/residents/${resident.id}`} key={resident.id}>
                        <strong>{resident.name}</strong>
                        <span className={resident.deterioration === "High" ? "badge danger" : "badge warning"}>{resident.deterioration === "High" ? "Deterioration" : "Falls review"}</span>
                        <div className="railMeta">
                            <span>Room {resident.room}</span>
                            <span>{resident.need}</span>
                            <span>Review due {resident.nextReview}</span>
                        </div>
                    </Link>
                ))}
                {careNotes.map((note) => (
                    <Link className="railItem interactiveRailItem" href={`/residents/${residents.find((resident) => resident.name === note.resident)?.id ?? "res-001"}`} key={`${note.resident}-${note.route}`}>
                        <strong>{note.type} note</strong>
                        <span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{note.route}</span>
                        <div className="railMeta">
                            <span>{note.resident}</span>
                            <span>{note.confidence} confidence</span>
                            <span>{note.tags.join(", ")}</span>
                        </div>
                    </Link>
                ))}
            </aside>
        </div>
    );
}



