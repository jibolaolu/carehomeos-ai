import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import { careHomes, demoUsers } from "../../lib/demo-data";
import { normalizeRole } from "../../lib/rbac";

export default async function PlatformAdminPage() {
  const session = await getAuthSession();
  const role = normalizeRole(session);
  if (session && role !== "super_admin") {
    redirect(role === "staff" ? "/staff-reporting" : "/dashboard");
  }

  const mrr = careHomes.reduce((total, home) => total + Number(home.mrr.replace(/[^0-9]/g, "")), 0);
  const superAdmins = demoUsers.filter((user) => user.role === "super_admin").length;
  const careHomeAdmins = demoUsers.filter((user) => user.role === "care_home_admin").length;

  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">CareHomeOS company admin</p>
          <h2 className="pageTitle">Platform oversight for care-home subscriptions</h2>
          <p className="pageLead">Super admins are CareHomeOS company staff. They are not care-home employees; they review provider onboarding, subscription state, support risk, and platform readiness.</p>
        </div>
        <Link className="btn primary" href="/plans">Review plans</Link>
      </div>

      <section className="metrics">
        <div className="metricTile"><p className="metricLabel">Active care homes</p><p className="metricValue">{careHomes.length}</p></div>
        <div className="metricTile"><p className="metricLabel">MRR</p><p className="metricValue">GBP {mrr}</p></div>
        <div className="metricTile"><p className="metricLabel">Company super admins</p><p className="metricValue">{superAdmins}</p></div>
        <div className="metricTile"><p className="metricLabel">Care home admins</p><p className="metricValue">{careHomeAdmins}</p></div>
      </section>

      <section className="split">
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Care home</th><th>Plan</th><th>Status</th><th>Residents</th><th>CQC</th></tr>
            </thead>
            <tbody>
              {careHomes.map((home) => (
                <tr key={home.id}>
                  <td><strong>{home.name}</strong><br /><span className="muted">{home.provider}</span></td>
                  <td>{home.plan}</td>
                  <td><span className={home.status === "Active" ? "badge success" : "badge warning"}>{home.status}</span></td>
                  <td>{home.residents}</td>
                  <td>{home.cqc}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="card">
          <h3 className="sectionTitle">Seeded login users</h3>
          <ul className="list">
            {demoUsers.map((user) => (
              <li className="listItem" key={user.id}>
                <span><strong>{user.email}</strong><br /><span className="muted">{user.role.replaceAll("_", " ")}</span></span>
                <span className="badge">local</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
