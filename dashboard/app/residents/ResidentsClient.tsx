"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import DeteriorationAlert from "../../components/clinical/DeteriorationAlert";
import FallsRiskBadge from "../../components/clinical/FallsRiskBadge";
import { residents as seededResidents } from "../../lib/demo-data";

type Resident = {
  id: string;
  name: string;
  room: string;
  age: number;
  mobility: string;
  primary_need: string;
  falls_risk: string;
  deterioration: string;
  hydration: string;
  family_contact: string;
  care_plan_review: string;
};

type ResidentForm = Omit<Resident, "id" | "age"> & { age: number | "" };

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";

function fromSeed(): Resident[] {
  return seededResidents.map((resident) => ({
    id: resident.id,
    name: resident.name,
    room: resident.room,
    age: resident.age,
    mobility: "Personalised support",
    primary_need: resident.need,
    falls_risk: resident.fallsRisk.toLowerCase(),
    deterioration: resident.deterioration.toLowerCase(),
    hydration: resident.hydration.toLowerCase(),
    family_contact: "Family contact",
    care_plan_review: "2026-05-01",
  }));
}

const blank: ResidentForm = {
  name: "",
  room: "",
  age: "",
  mobility: "",
  primary_need: "",
  falls_risk: "",
  deterioration: "",
  hydration: "",
  family_contact: "",
  care_plan_review: "",
};

export default function ResidentsClient() {
  const [residents, setResidents] = useState<Resident[]>(fromSeed);
  const [form, setForm] = useState<ResidentForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("Add a resident or select Edit to update their care record.");
  const formRef = useRef<HTMLFormElement | null>(null);

  const editingResident = useMemo(() => residents.find((resident) => resident.id === editingId), [editingId, residents]);

  function edit(resident: Resident) {
    setEditingId(resident.id);
    setForm({
      name: resident.name,
      room: resident.room,
      age: resident.age,
      mobility: resident.mobility,
      primary_need: resident.primary_need,
      falls_risk: resident.falls_risk,
      deterioration: resident.deterioration,
      hydration: resident.hydration,
      family_contact: resident.family_contact,
      care_plan_review: resident.care_plan_review,
    });
    setMessage(`Editing ${resident.name}. Update the fields below and save changes.`);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function reset() {
    setEditingId(null);
    setForm(blank);
    setMessage("Ready for a new resident record.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = editingId ? `${apiBase}/residents/${editingId}` : `${apiBase}/residents`;
    const method = editingId ? "PUT" : "POST";
    const payload: Omit<Resident, "id"> = {
      ...form,
      age: Number(form.age),
    };
    setMessage(editingId ? "Updating resident..." : "Creating resident...");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const saved: Resident = await response.json();
      setResidents((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setMessage(`${saved.name} saved successfully.`);
      reset();
    } catch (error) {
      const local: Resident = { id: editingId ?? `local-${Date.now()}`, ...payload };
      setResidents((current) => editingId ? current.map((item) => item.id === local.id ? local : item) : [...current, local]);
      setMessage(error instanceof Error ? `API unavailable, saved in browser preview: ${error.message}` : "Saved in browser preview.");
      reset();
    }
  }

  return (
    <section className="stack">
      <div className="pageHeader">
        <div>
          <span className="badge">Resident administration</span>
          <h2 className="pageTitle">Residents</h2>
          <p className="pageLead">Create and maintain resident records, risks, family contacts, and review dates from one admin screen.</p>
        </div>
        <button className="btn" type="button" onClick={reset}>New resident</button>
      </div>

      <section className="split adminEditorSplit">
        <form className={`card editorForm ${editingResident ? "editingForm" : ""}`} onSubmit={submit} ref={formRef}>
          <div className="editorHeader">
            <div>
              <h3 className="sectionTitle">{editingResident ? `Edit ${editingResident.name}` : "Add resident"}</h3>
              <p className="muted">{editingResident ? "You are updating an existing resident record." : "Create a new resident profile for care planning and review tracking."}</p>
            </div>
            {editingResident ? <span className="badge warning">Editing live record</span> : null}
          </div>
          <div className="formGrid">
            <label className="field">Name<input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label className="field">Room<input className="input" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} required /></label>
            <label className="field">Age<input className="input" type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value === "" ? "" : Number(event.target.value) })} required /></label>
            <label className="field">Care plan review<input className="input" type="date" value={form.care_plan_review} onChange={(event) => setForm({ ...form, care_plan_review: event.target.value })} required /></label>
            <label className="field">Primary need<input className="input" value={form.primary_need} onChange={(event) => setForm({ ...form, primary_need: event.target.value })} required /></label>
            <label className="field">Mobility<input className="input" value={form.mobility} onChange={(event) => setForm({ ...form, mobility: event.target.value })} /></label>
            <label className="field">Falls risk<select className="select" value={form.falls_risk} onChange={(event) => setForm({ ...form, falls_risk: event.target.value })} required><option value="">Select falls risk</option><option>low</option><option>medium</option><option>high</option></select></label>
            <label className="field">Deterioration<select className="select" value={form.deterioration} onChange={(event) => setForm({ ...form, deterioration: event.target.value })} required><option value="">Select deterioration</option><option>low</option><option>medium</option><option>high</option></select></label>
            <label className="field">Hydration<select className="select" value={form.hydration} onChange={(event) => setForm({ ...form, hydration: event.target.value })} required><option value="">Select hydration</option><option>stable</option><option>watch</option><option>concern</option></select></label>
            <label className="field">Family contact<input className="input" value={form.family_contact} onChange={(event) => setForm({ ...form, family_contact: event.target.value })} /></label>
          </div>
          <div className="actions">
            <button className="btn primary" type="submit">{editingId ? "Save changes" : "Add resident"}</button>
            <button className="btn" type="button" onClick={reset}>Clear</button>
          </div>
          <p className="muted">{message}</p>
        </form>

        <div className="tableWrap">
          <table>
            <thead><tr><th>Resident</th><th>Need</th><th>Risk</th><th>Review</th><th>Actions</th></tr></thead>
            <tbody>
              {residents.map((resident) => (
                <tr key={resident.id} className={editingId === resident.id ? "activeRow" : undefined}>
                  <td><strong>{resident.name}</strong><br /><span className="muted">Room {resident.room}, age {resident.age}</span></td>
                  <td>{resident.primary_need}<br /><span className="muted">{resident.mobility}</span></td>
                  <td><FallsRiskBadge risk={resident.falls_risk} /> <DeteriorationAlert level={resident.deterioration} /></td>
                  <td>{resident.care_plan_review}<br /><span className={resident.hydration === "concern" ? "badge danger" : resident.hydration === "watch" ? "badge warning" : "badge success"}>{resident.hydration}</span></td>
                  <td>
                    <div className="actions tableActions">
                      <button className="btn" type="button" onClick={() => edit(resident)}>Edit</button>
                      <Link className="btn" href={`/residents/${resident.id}`}>Open</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
