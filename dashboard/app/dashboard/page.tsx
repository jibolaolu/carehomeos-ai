import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardLiveFeed from "../../components/dashboard/DashboardLiveFeed";
import DashboardNotesRail from "../../components/dashboard/DashboardNotesRail";
import RoleDashboardControls from "../../components/dashboard/RoleDashboardControls";
import { createSessionSummary, getAuthSession } from "../../lib/auth-session";
import { cqc, incidents, marRound, residents, staff } from "../../lib/demo-data";
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

        <DashboardLiveFeed />

        <section className="metrics">
          <Link className="metricTile interactiveCard" href="/residents">
            <div className="metricTileBody"><p className="metricLabel">Residents</p><div className="metricValue">{residents.length}</div><p className="muted">Live local data</p></div>
            <div className="metricIcon blue">R</div>
          </Link>
          <Link className="metricTile interactiveCard" href="/residents?risk=high">
            <div className="metricTileBody"><p className="metricLabel">High-risk reviews</p><div className="metricValue">{highRiskResidents.length}</div><p className="muted">Needs senior review</p></div>
            <div className="metricIcon yellow">!</div>
          </Link>
          <Link className="metricTile interactiveCard" href="/mar?status=due">
            <div className="metricTileBody"><p className="metricLabel">eMAR completed</p><div className="metricValue">{completedMeds}</div><p className="muted">{dueMeds.length} still due</p></div>
            <div className="metricIcon green">M</div>
          </Link>
          <Link className="metricTile interactiveCard" href="/cqc">
            <div className="metricTileBody"><p className="metricLabel">CQC readiness</p><div className="metricValue">{avgCqc}%</div><p className="muted">Evidence score</p></div>
            <div className="metricIcon purple">C</div>
          </Link>
          <Link className="metricTile interactiveCard" href="/staff-reporting">
            <div className="metricTileBody"><p className="metricLabel">Staff reporting</p><div className="metricValue metricValueText">Live</div><p className="muted">Notes arriving from staff workflow</p></div>
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
            <ul className="list incidentPreviewList">
              {incidents.map((incident) => (
                <li key={incident.id}>
                  <Link className="listItem interactiveListItem incidentPreviewItem" href="/incidents">
                    <span><strong>{incident.type}</strong><br /><span className="muted">{incident.resident}</span></span>
                    <span className={incident.severity === "High" ? "badge danger" : "badge warning"}>{incident.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <aside className="rightRail dashboardRightRail">
        <div className="railHeader">
          <div>
            <h3 className="railTitle">Newest alerts</h3>
            <p className="muted">Clinical and compliance feed</p>
          </div>
          <span className="badge success">Live</span>
        </div>
        <div className="liveStatusLine"><span className="liveDot" /> Dashboard feed refresh every 5 seconds</div>
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

        <DashboardNotesRail />
      </aside>
    </div>
  );
}

