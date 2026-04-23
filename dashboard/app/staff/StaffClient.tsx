"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { staff as seededStaff } from "../../lib/demo-data";

type StaffMember = {
  id?: string;
  name: string;
  role: string;
  shift: string;
  training: number;
  status?: string;
  phone?: string;
  employment_type?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";

const blank: StaffMember = {
  name: "",
  role: "Carer",
  shift: "07:30-15:30",
  training: 85,
  status: "active",
  phone: "",
  employment_type: "Permanent",
};

export default function StaffClient() {
  const [members, setMembers] = useState<StaffMember[]>(seededStaff.map((member, index) => ({ id: `staff-${index + 1}`, ...member, status: "active", employment_type: "Permanent" })));
  const [form, setForm] = useState<StaffMember>(blank);
  const [message, setMessage] = useState("Add staff so rota planning can use the updated workforce.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Creating staff member...");
    try {
      const response = await fetch(`${apiBase}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const created = await response.json();
      setMembers((current) => [...current, created]);
      setMessage(`${created.name} added.`);
      setForm(blank);
    } catch (error) {
      setMembers((current) => [...current, { ...form, id: `local-${Date.now()}` }]);
      setMessage(error instanceof Error ? `API unavailable, saved in browser preview: ${error.message}` : "Saved in browser preview.");
      setForm(blank);
    }
  }

  return (
    <section className="stack">
      <div className="pageHeader">
        <div>
          <span className="badge">Workforce</span>
          <h2 className="pageTitle">Staff compliance and shift readiness</h2>
          <p className="pageLead">Add staff, track training, and keep role cover visible before rota gaps affect resident care.</p>
        </div>
      </div>

      <section className="split adminEditorSplit">
        <form className="card editorForm" onSubmit={submit}>
          <h3 className="sectionTitle">Add staff member</h3>
          <div className="formGrid">
            <label className="field">Name<input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label className="field">Role<select className="select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Carer</option><option>Senior carer</option><option>Nurse</option><option>Clinical lead</option><option>Deputy manager</option></select></label>
            <label className="field">Shift<input className="input" value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value })} required /></label>
            <label className="field">Training %<input className="input" min={0} max={100} type="number" value={form.training} onChange={(event) => setForm({ ...form, training: Number(event.target.value) })} /></label>
            <label className="field">Employment<select className="select" value={form.employment_type} onChange={(event) => setForm({ ...form, employment_type: event.target.value })}><option>Permanent</option><option>Bank</option><option>Agency</option></select></label>
            <label className="field">Phone<input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          </div>
          <button className="btn primary" type="submit">Add staff</button>
          <p className="muted">{message}</p>
        </form>

        <div className="grid staffGrid">
          {members.map((member) => (
            <Link className="card staffCard interactiveCard staffProfileLink" href={`/staff/${member.id ?? encodeURIComponent(member.name)}`} key={member.id ?? member.name}>
              <div className="listItem">
                <span><strong>{member.name}</strong><br /><span className="muted">{member.role}</span></span>
                <span className={member.training >= 90 ? "badge success" : member.training >= 80 ? "badge warning" : "badge danger"}>{member.training}%</span>
              </div>
              <p className="muted">{member.shift} · {member.employment_type ?? "Permanent"}</p>
              <div className="progress"><span style={{ width: `${member.training}%` }} /></div>
              <p className="muted">{member.phone || "No phone added"}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
