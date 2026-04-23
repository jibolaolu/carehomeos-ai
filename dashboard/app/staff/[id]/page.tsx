import Link from "next/link";
import { staff } from "../../../lib/demo-data";

type PageParams = {
  id: string;
};

export default async function StaffDetailPage({ params }: { params: Promise<PageParams> }) {
  const { id } = await params;
  const indexMatch = id.match(/^staff-(\d+)$/);
  const memberIndex = indexMatch ? Number(indexMatch[1]) - 1 : -1;
  const member = staff[memberIndex] ?? staff.find((item) => encodeURIComponent(item.name) === id) ?? staff[0];
  const employment = "Permanent";
  const phone = "";

  return (
    <section className="stack">
      <div className="pageHeader">
        <div>
          <span className="badge">Staff profile</span>
          <h2 className="pageTitle">{member.name}</h2>
          <p className="pageLead">Review role, rota cover, contact details, training compliance, and operational notes before making changes.</p>
        </div>
        <Link className="btn" href="/staff">Back to staff</Link>
      </div>

      <section className="split adminEditorSplit">
        <form className="card editorForm">
          <h3 className="sectionTitle">Edit staff details</h3>
          <div className="formGrid">
            <label className="field">Name<input className="input" defaultValue={member.name} /></label>
            <label className="field">Role<select className="select" defaultValue={member.role}><option>Carer</option><option>Senior carer</option><option>Nurse</option><option>Clinical lead</option><option>Deputy manager</option></select></label>
            <label className="field">Shift<input className="input" defaultValue={member.shift} /></label>
            <label className="field">Training %<input className="input" type="number" min={0} max={100} defaultValue={member.training} /></label>
            <label className="field">Employment<select className="select" defaultValue={employment}><option>Permanent</option><option>Bank</option><option>Agency</option></select></label>
            <label className="field">Phone<input className="input" defaultValue={phone} placeholder="Add phone number" /></label>
          </div>
          <div className="actions">
            <button className="btn primary" type="button">Save staff record</button>
            <Link className="btn" href="/rota">Review rota</Link>
          </div>
          <p className="muted">Local preview form. Backend save wiring can persist these changes once the staff API is connected.</p>
        </form>

        <div className="grid">
          <div className="card">
            <h3 className="sectionTitle">Compliance status</h3>
            <div className="metricValue">{member.training}%</div>
            <div className="progress"><span style={{ width: `${member.training}%` }} /></div>
            <p className="muted">Training and supervision record visible to manager and deputy roles.</p>
          </div>
          <div className="card">
            <h3 className="sectionTitle">Operational notes</h3>
            <ul className="list">
              <li className="listItem"><span>Shift pattern</span><strong>{member.shift}</strong></li>
              <li className="listItem"><span>Role cover</span><strong>{member.role}</strong></li>
              <li className="listItem"><span>Employment</span><strong>{employment}</strong></li>
            </ul>
          </div>
        </div>
      </section>
    </section>
  );
}
