"use client";

import { FormEvent, useMemo, useState } from "react";
import { staff } from "../../lib/demo-data";
import { getApiBase } from "../../lib/api-base";

type Shift = {
  id: string;
  weekStart: string;
  day: string;
  time: string;
  staff: string;
  role: string;
  zone: string;
  status: "confirmed" | "open" | "ai suggested";
};

type Availability = {
  name: string;
  role: string;
  available: string[];
  preference: string;
  training: number;
};

const apiBase = getApiBase();
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const times = ["07:30-15:30", "08:00-20:00", "14:00-22:00", "20:00-08:00"];
const zones = ["Residential", "Nursing", "Dementia", "Night cover"];

function toDateInputValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, daysToAdd: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + daysToAdd);
  return copy;
}

function formatWeekRange(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function dayDateLabel(weekStart: string, dayIndex: number) {
  return addDays(new Date(`${weekStart}T00:00:00`), dayIndex).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const currentWeekStart = toDateInputValue(startOfWeek(new Date()));

const availability: Availability[] = staff.map((member, index) => ({
  name: member.name,
  role: member.role,
  available: index === 0 ? ["Monday", "Tuesday", "Wednesday", "Thursday"] : index === 1 ? ["Monday", "Wednesday", "Friday"] : index === 2 ? ["Monday", "Tuesday", "Thursday", "Saturday"] : ["Tuesday", "Friday", "Sunday"],
  preference: index === 2 ? "Long day nursing cover" : index === 3 ? "Afternoon cover" : "Day cover",
  training: member.training,
}));

const initialShifts: Shift[] = [
  { id: "shift-001", weekStart: currentWeekStart, day: "Monday", time: "07:30-15:30", staff: "Amelia Williams", role: "Senior carer", zone: "Residential", status: "confirmed" },
  { id: "shift-002", weekStart: currentWeekStart, day: "Monday", time: "08:00-20:00", staff: "Priya Nair", role: "Nurse", zone: "Nursing", status: "confirmed" },
  { id: "shift-003", weekStart: currentWeekStart, day: "Tuesday", time: "14:00-22:00", staff: "Open shift", role: "Carer", zone: "Dementia", status: "open" },
];

function aiPlanForWeek(weekStart: string): Shift[] {
  return [
    { id: `ai-${weekStart}-001`, weekStart, day: "Tuesday", time: "14:00-22:00", staff: "Sam Brooks", role: "Carer", zone: "Dementia", status: "ai suggested" },
    { id: `ai-${weekStart}-002`, weekStart, day: "Wednesday", time: "07:30-15:30", staff: "Jon Clarke", role: "Carer", zone: "Residential", status: "ai suggested" },
    { id: `ai-${weekStart}-003`, weekStart, day: "Thursday", time: "08:00-20:00", staff: "Priya Nair", role: "Nurse", zone: "Nursing", status: "ai suggested" },
    { id: `ai-${weekStart}-004`, weekStart, day: "Friday", time: "14:00-22:00", staff: "Sam Brooks", role: "Carer", zone: "Dementia", status: "ai suggested" },
  ];
}

export default function RotaClient() {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [selectedWeekStart, setSelectedWeekStart] = useState(currentWeekStart);
  const [form, setForm] = useState<Omit<Shift, "id">>({
    weekStart: currentWeekStart,
    day: "Monday",
    time: "07:30-15:30",
    staff: staff[0]?.name ?? "",
    role: "Carer",
    zone: "Residential",
    status: "confirmed",
  });
  const [message, setMessage] = useState("Build the rota manually or let AI draft safe cover from availability.");
  const weekShifts = useMemo(() => shifts.filter((shift) => shift.weekStart === selectedWeekStart), [selectedWeekStart, shifts]);
  const gaps = useMemo(() => weekShifts.filter((shift) => shift.status !== "confirmed"), [weekShifts]);
  const confirmed = weekShifts.filter((shift) => shift.status === "confirmed").length;

  function selectWeek(weekStart: string) {
    setSelectedWeekStart(weekStart);
    setForm((current) => ({ ...current, weekStart }));
    setMessage(`Planning rota for week ${formatWeekRange(weekStart)}.`);
  }

  function moveWeek(offset: number) {
    selectWeek(toDateInputValue(addDays(new Date(`${selectedWeekStart}T00:00:00`), offset * 7)));
  }

  function generateWithAi() {
    setShifts((current) => {
      const existing = new Set(current.map((shift) => `${shift.weekStart}-${shift.day}-${shift.time}-${shift.zone}`));
      const additions = aiPlanForWeek(selectedWeekStart).filter((shift) => !existing.has(`${shift.weekStart}-${shift.day}-${shift.time}-${shift.zone}`));
      return [...current, ...additions];
    });
    setMessage(`AI draft generated for week ${formatWeekRange(selectedWeekStart)}. Review and confirm before publishing.`);
  }

  function confirmAiShift(shiftId: string) {
    setShifts((current) => current.map((shift) => shift.id === shiftId ? { ...shift, status: "confirmed" } : shift));
    setMessage("Shift confirmed and ready for publishing.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Adding shift...");
    try {
      const response = await fetch(`${apiBase}/rota/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const created = await response.json();
      setShifts((current) => [...current, created]);
      setMessage(`${created.staff} added to ${created.day}.`);
    } catch (error) {
      setShifts((current) => [...current, { id: `local-${Date.now()}`, ...form }]);
      setMessage(error instanceof Error ? `API unavailable, saved in browser preview: ${error.message}` : "Saved in browser preview.");
    }
  }

  return (
    <section className="stack">
      <div className="pageHeader">
        <div>
          <span className="badge">Rota optimisation</span>
          <h2 className="pageTitle">AI-assisted staffing and schedule planner</h2>
          <p className="pageLead">Generate safe cover from staff availability, training, roles, and care-zone demand, or build shifts manually for manager approval.</p>
        </div>
        <div className="actions">
          <button className="btn primary" type="button" onClick={generateWithAi}>Generate with AI</button>
          <button className="btn" type="button" onClick={() => setMessage("Manual scheduling mode ready. Add a shift using the planner form.")}>Manual plan</button>
        </div>
      </div>

      <section className="card weekPlanner">
        <div>
          <span className="badge">Rota week</span>
          <h3 className="sectionTitle">{formatWeekRange(selectedWeekStart)}</h3>
          <p className="muted">Create, review, and approve schedules for current or future weeks.</p>
        </div>
        <div className="weekControls">
          <button className="btn" type="button" onClick={() => moveWeek(-1)}>Previous week</button>
          <label className="field">Week commencing<input className="input" type="date" value={selectedWeekStart} onChange={(event) => selectWeek(toDateInputValue(startOfWeek(new Date(`${event.target.value}T00:00:00`))))} /></label>
          <button className="btn" type="button" onClick={() => selectWeek(currentWeekStart)}>This week</button>
          <button className="btn" type="button" onClick={() => moveWeek(1)}>Next week</button>
        </div>
      </section>

      <section className="metrics">
        <div className="metricTile detailMetric"><p className="metricLabel">Confirmed shifts</p><p className="metricValue">{confirmed}</p><p className="muted">Ready to publish</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Open gaps</p><p className="metricValue">{gaps.length}</p><p className="muted">Need review</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">Day ratio</p><p className="metricValue">1:6</p><p className="muted">Care hours baseline</p></div>
        <div className="metricTile detailMetric"><p className="metricLabel">AI status</p><p className="metricValue">{shifts.some((shift) => shift.status === "ai suggested") ? "Draft" : "Ready"}</p><p className="muted">Manager approval required</p></div>
      </section>

      <section className="rotaPlannerGrid">
        <form className="card editorForm" onSubmit={submit}>
          <h3 className="sectionTitle">Create shift</h3>
          <div className="formGrid">
            <label className="field">Day<select className="select" value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
            <label className="field">Time<select className="select" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })}>{times.map((time) => <option key={time}>{time}</option>)}</select></label>
            <label className="field">Staff<select className="select" value={form.staff} onChange={(event) => setForm({ ...form, staff: event.target.value })}>{staff.map((member) => <option key={member.name}>{member.name}</option>)}</select></label>
            <label className="field">Role<select className="select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Carer</option><option>Senior carer</option><option>Nurse</option><option>Clinical lead</option></select></label>
            <label className="field">Zone<select className="select" value={form.zone} onChange={(event) => setForm({ ...form, zone: event.target.value })}>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
            <label className="field">Status<select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Shift["status"] })}><option value="confirmed">confirmed</option><option value="open">open</option><option value="ai suggested">ai suggested</option></select></label>
          </div>
          <button className="btn primary" type="submit">Add shift</button>
          <p className="muted">{message}</p>
        </form>

        <div className="card availabilityPanel">
          <h3 className="sectionTitle">Availability and cover intelligence</h3>
          <div className="availabilityList">
            {availability.map((member) => (
              <div className="availabilityRow" key={member.name}>
                <span><strong>{member.name}</strong><small>{member.role} - {member.preference}</small></span>
                <span className={member.training >= 90 ? "badge success" : "badge warning"}>{member.training}%</span>
                <small>{member.available.join(", ")}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rotaBoard professionalRotaBoard">
        {days.map((day) => (
          <article className="rotaDay" key={day}>
            <header><strong>{day}</strong><span>{dayDateLabel(selectedWeekStart, days.indexOf(day))}</span><span>{weekShifts.filter((shift) => shift.day === day).length} shifts</span></header>
            {weekShifts.filter((shift) => shift.day === day).map((shift) => (
              <div className={shift.status === "confirmed" ? "rotaShift" : "rotaShift open"} key={shift.id}>
                <strong>{shift.time}</strong>
                <span>{shift.staff}</span>
                <small>{shift.role} - {shift.zone}</small>
                {shift.status === "ai suggested" ? <button className="miniButton" type="button" onClick={() => confirmAiShift(shift.id)}>Confirm</button> : <small>{shift.status}</small>}
              </div>
            ))}
            {weekShifts.filter((shift) => shift.day === day).length === 0 ? <p className="muted">No cover assigned</p> : null}
          </article>
        ))}
      </section>
    </section>
  );
}
