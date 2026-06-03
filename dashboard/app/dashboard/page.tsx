import Link from "next/link";
import { redirect } from "next/navigation";
import { createSessionSummary, getAuthSession } from "../../lib/auth-session";
import { cqc, incidents, marRound, residents, staff, careNotes } from "../../lib/demo-data";
import { normalizeRole } from "../../lib/rbac";
import DashboardLiveFeed from "../../components/dashboard/DashboardLiveFeed";
import RoleDashboardControls from "../../components/dashboard/RoleDashboardControls";

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login?returnTo=/dashboard");
  }
  const role = normalizeRole(session);
  if (role === "super_admin") redirect("/platform-admin");
  if (role === "staff") redirect("/staff-reporting");

  /* ── Computed stats ─────────────────────────────────────────────── */
  const highRisk       = residents.filter((r) => r.fallsRisk === "High" || r.deterioration === "High");
  const hydrationWatch = residents.filter((r) => r.hydration === "Watch" || r.hydration === "Concern");
  const dueMeds        = marRound.filter((r) => r.status === "Due");
  const administeredMeds = marRound.filter((r) => r.status === "Administered");
  const avgCqc         = Math.round(cqc.reduce((sum, item) => sum + item.score, 0) / cqc.length);
  const activeStaff    = staff.filter((s) => s.shift.startsWith("07") || s.shift.startsWith("08") || s.shift.startsWith("09")).length;
  const openIncidents  = incidents.filter((i) => i.status !== "Closed").length;
  const carePlansDue   = residents.filter((r) => {
    const days = Math.ceil((new Date(r.nextReview + " 2026").getTime() - Date.now()) / 86400000);
    return days <= 7;
  }).length;

  const todayDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  /* ── Quick-access modules ───────────────────────────────────────── */
  const modules = [
    { href: "/residents",          icon: "R",  color: "moduleBlue",    title: "Residents",      desc: `${residents.length} under care` },
    { href: "/mar",                icon: "M",  color: "moduleGreen",   title: "Medication",     desc: `${administeredMeds.length}/${marRound.length} done` },
    { href: "/incidents",          icon: "⚠",  color: "moduleAmber",   title: "Incidents",      desc: `${openIncidents} open` },
    { href: "/shift-notes",        icon: "🎙", color: "moduleTeal",    title: "Shift notes",    desc: "Voice → CQC notes" },
    { href: "/cqc",                icon: "C",  color: "modulePurple",  title: "CQC readiness",  desc: `${avgCqc}% evidence score` },
    { href: "/staff",              icon: "S",  color: "moduleIndigo",  title: "Staff",           desc: `${staff.length} on register` },
    { href: "/rota",               icon: "T",  color: "moduleSlate",   title: "Rota",            desc: `${activeStaff} on shift now` },
    { href: "/clinical/vitals",    icon: "V",  color: "moduleRose",    title: "Vitals",          desc: "NEWS2 monitoring" },
  ];

  return (
    <div className="dashboardGrid">
      {/* ── Main panel ─────────────────────────────────────────────────── */}
      <div className="mainPanel">

        {/* ── Hero header ──────────────────────────────────────────── */}
        <div className="dashHero">
          <div className="dashHeroLeft">
            <p className="eyebrow">Care home dashboard</p>
            <h2 className="pageTitle">{session.careHomeName ?? "Oakfield House"}</h2>
            <p className="muted">{todayDate} · {role === "care_home_admin" ? "Registered manager view" : "Deputy manager view"}</p>
          </div>
          <div className="dashHeroRight">
            <RoleDashboardControls initialUser={createSessionSummary(session)} />
          </div>
        </div>

        {/* ── Alert strip (urgent items) ────────────────────────────── */}
        {(highRisk.length > 0 || hydrationWatch.length > 0 || dueMeds.length > 0) && (
          <div className="dashAlertStrip">
            <span className="dashAlertIcon">⚠</span>
            <div className="dashAlertItems">
              {highRisk.length > 0 && (
                <Link href="/residents?risk=high" className="dashAlertPill dashAlertDanger">
                  {highRisk.length} high-risk resident{highRisk.length !== 1 ? "s" : ""} · review needed
                </Link>
              )}
              {dueMeds.length > 0 && (
                <Link href="/mar?status=due" className="dashAlertPill dashAlertWarning">
                  {dueMeds.length} medication{dueMeds.length !== 1 ? "s" : ""} due
                </Link>
              )}
              {hydrationWatch.length > 0 && (
                <Link href="/residents" className="dashAlertPill dashAlertInfo">
                  {hydrationWatch.length} hydration concern{hydrationWatch.length !== 1 ? "s" : ""}
                </Link>
              )}
              {carePlansDue > 0 && (
                <Link href="/residents" className="dashAlertPill dashAlertInfo">
                  {carePlansDue} care plan review{carePlansDue !== 1 ? "s" : ""} due this week
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Key metrics ──────────────────────────────────────────── */}
        <section className="dashMetrics">
          <Link href="/residents" className="dashMetric dashMetricBlue">
            <div className="dashMetricBody">
              <p className="dashMetricLabel">Residents</p>
              <p className="dashMetricValue">{residents.length}</p>
              <p className="dashMetricSub">{highRisk.length} high-risk</p>
            </div>
            <div className="dashMetricIcon">R</div>
          </Link>

          <Link href="/mar" className="dashMetric dashMetricGreen">
            <div className="dashMetricBody">
              <p className="dashMetricLabel">eMAR progress</p>
              <p className="dashMetricValue">{administeredMeds.length}<span className="dashMetricDen">/{marRound.length}</span></p>
              <p className="dashMetricSub">{dueMeds.length} still due</p>
            </div>
            <div className="dashMetricIcon">M</div>
          </Link>

          <Link href="/incidents" className="dashMetric dashMetricAmber">
            <div className="dashMetricBody">
              <p className="dashMetricLabel">Open incidents</p>
              <p className="dashMetricValue">{openIncidents}</p>
              <p className="dashMetricSub">RCA and review queue</p>
            </div>
            <div className="dashMetricIcon">!</div>
          </Link>

          <Link href="/cqc" className="dashMetric dashMetricPurple">
            <div className="dashMetricBody">
              <p className="dashMetricLabel">CQC readiness</p>
              <p className="dashMetricValue">{avgCqc}%</p>
              <p className="dashMetricSub">Evidence score</p>
            </div>
            <div className="dashMetricIcon">C</div>
          </Link>

          <Link href="/staff" className="dashMetric dashMetricSlate">
            <div className="dashMetricBody">
              <p className="dashMetricLabel">Staff on shift</p>
              <p className="dashMetricValue">{activeStaff}</p>
              <p className="dashMetricSub">{staff.length} total registered</p>
            </div>
            <div className="dashMetricIcon">S</div>
          </Link>
        </section>

        {/* ── Live care-note feed ───────────────────────────────────── */}
        <DashboardLiveFeed />

        {/* ── Quick access modules ──────────────────────────────────── */}
        <section className="dashModuleGrid">
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href} className={`dashModule ${mod.color}`}>
              <div className="dashModuleIcon">{mod.icon}</div>
              <div>
                <p className="dashModuleTitle">{mod.title}</p>
                <p className="dashModuleDesc">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* ── Resident and staff snapshot ───────────────────────────── */}
        <section className="grid">
          {/* Resident risk table */}
          <div className="card">
            <div className="listItem" style={{ marginBottom: 12 }}>
              <h3 className="sectionTitle">Resident risk overview</h3>
              <Link href="/residents" className="btn">All residents</Link>
            </div>
            <ul className="list">
              {residents.map((r) => (
                <li key={r.id}>
                  <Link href={`/residents/${r.id}`} className="listItem interactiveListItem">
                    <span>
                      <strong>{r.name}</strong>
                      <br />
                      <span className="muted">Room {r.room} · {r.need}</span>
                    </span>
                    <div style={{ display: "flex", gap: 4, flexDirection: "column", alignItems: "flex-end" }}>
                      {r.fallsRisk === "High" && <span className="badge danger">Falls</span>}
                      {r.deterioration === "High" && <span className="badge danger">Deterioration</span>}
                      {(r.hydration === "Watch" || r.hydration === "Concern") && <span className="badge warning">Hydration</span>}
                      {r.fallsRisk !== "High" && r.deterioration !== "High" && r.hydration === "Stable" && (
                        <span className="badge success">Stable</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Staff on shift */}
          <div className="card">
            <div className="listItem" style={{ marginBottom: 12 }}>
              <h3 className="sectionTitle">Shift cover today</h3>
              <Link href="/rota" className="btn">View rota</Link>
            </div>
            <ul className="list">
              {staff.map((member) => (
                <li key={member.name}>
                  <Link href="/rota" className="listItem interactiveListItem">
                    <span>
                      <strong>{member.name}</strong>
                      <br />
                      <span className="muted">{member.role}</span>
                    </span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="badge">{member.shift}</span>
                      {member.training >= 95 && <span className="badge success">Compliant</span>}
                      {member.training < 85 && <span className="badge warning">Training</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Recent care notes ─────────────────────────────────────── */}
        <section className="card">
          <div className="listItem" style={{ marginBottom: 12 }}>
            <h3 className="sectionTitle">Recent care notes</h3>
            <Link href="/staff-reporting" className="btn primary">Staff reporting</Link>
          </div>
          <ul className="list">
            {careNotes.map((note, i) => (
              <li key={i} className="listItem">
                <span>
                  <strong>{note.resident}</strong>
                  <span className="muted" style={{ marginLeft: 8 }}>{note.type}</span>
                  <br />
                  <span className="muted">{note.summary}</span>
                </span>
                <div style={{ display: "flex", gap: 4, flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                  <span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>
                    {note.route} {note.confidence}
                  </span>
                  {note.tags.map((tag) => (
                    <span key={tag} className="badge" style={{ fontSize: "0.7rem" }}>{tag}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Incident review ───────────────────────────────────────── */}
        <section className="card">
          <div className="listItem" style={{ marginBottom: 12 }}>
            <h3 className="sectionTitle">Incident review queue</h3>
            <Link href="/incidents" className="btn">All incidents</Link>
          </div>
          <ul className="list">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <Link href="/incidents" className="listItem interactiveListItem">
                  <span>
                    <strong>{incident.type}</strong>
                    <br />
                    <span className="muted">{incident.resident}</span>
                  </span>
                  <span className={incident.severity === "High" ? "badge danger" : "badge warning"}>
                    {incident.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── Right rail ─────────────────────────────────────────────────── */}
      <aside className="rightRail dashboardRightRail">
        <div className="railHeader">
          <div>
            <h3 className="railTitle">Priority alerts</h3>
            <p className="muted">Residents needing attention</p>
          </div>
          <span className={highRisk.length > 0 ? "badge danger" : "badge success"}>
            {highRisk.length > 0 ? `${highRisk.length} urgent` : "All clear"}
          </span>
        </div>

        <div className="liveStatusLine"><span className="liveDot" /> Dashboard refresh every 5 seconds</div>

        {highRisk.map((r) => (
          <Link className="railItem interactiveRailItem" href={`/residents/${r.id}`} key={r.id}>
            <strong>{r.name}</strong>
            <span className={r.deterioration === "High" ? "badge danger" : "badge warning"}>
              {r.deterioration === "High" ? "Deterioration" : "Falls risk"}
            </span>
            <div className="railMeta">
              <span>Room {r.room}</span>
              <span>{r.need}</span>
              <span>Review {r.nextReview}</span>
            </div>
          </Link>
        ))}

        {highRisk.length === 0 && (
          <div className="railItem">
            <span className="badge success">All residents stable</span>
            <p className="muted" style={{ marginTop: 4 }}>No high-risk residents at this time.</p>
          </div>
        )}

        <div className="railHeader" style={{ marginTop: 20 }}>
          <div>
            <h3 className="railTitle">CQC evidence</h3>
            <p className="muted">Key question scores</p>
          </div>
          <span className="badge">{avgCqc}%</span>
        </div>

        {cqc.map((item) => (
          <div key={item.key} style={{ padding: "8px 0", borderBottom: "1px solid var(--card-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>{item.key}</span>
              <span style={{ fontSize: "13px", color: item.score >= 85 ? "var(--success)" : item.score >= 75 ? "var(--warning)" : "var(--danger)" }}>
                {item.score}%
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${item.score}%`, background: item.score >= 85 ? "var(--success)" : item.score >= 75 ? "var(--warning)" : "var(--danger)" }} />
            </div>
          </div>
        ))}

        <div className="railHeader" style={{ marginTop: 20 }}>
          <div>
            <h3 className="railTitle">eMAR status</h3>
            <p className="muted">Today&apos;s medication round</p>
          </div>
        </div>

        {marRound.map((entry) => (
          <div key={`${entry.resident}-${entry.medication}`} style={{ padding: "8px 0", borderBottom: "1px solid var(--card-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px" }}>
                <strong>{entry.resident}</strong>
                <br />
                <span className="muted">{entry.medication}</span>
              </span>
              <span className={entry.status === "Administered" ? "badge success" : "badge warning"} style={{ flexShrink: 0 }}>
                {entry.status}
              </span>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
