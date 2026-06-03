import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import { cqc } from "../../lib/demo-data";
import {
  CheckCircle2, AlertTriangle, Clock, FileText,
  ShieldCheck, Activity, Heart, MessageSquare, Building2,
  Download, Upload, ChevronRight, XCircle,
} from "lucide-react";

/* ── Static PIR data ────────────────────────────────────────────────────── */
const PIR_SECTIONS = [
  {
    key: "Safe",
    icon: ShieldCheck,
    colour: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    subsections: [
      { label: "Medication management", status: "review", evidence: 12, action: "2 omissions in last 30 days — RCA in progress", owner: "Ruth Manager" },
      { label: "Falls prevention and learning", status: "concern", evidence: 8, action: "3 unwitnessed falls — Postural assessment booked", owner: "Devon Deputy" },
      { label: "Infection prevention and control", status: "compliant", evidence: 14, action: "IPC audit completed April 2026", owner: "Priya Nair" },
      { label: "Safeguarding adults", status: "compliant", evidence: 9, action: "All staff trained, 1 referral closed", owner: "Ruth Manager" },
      { label: "Safe staffing and recruitment", status: "compliant", evidence: 5, action: "DBS checks current; staffing ratios met", owner: "Devon Deputy" },
    ],
  },
  {
    key: "Effective",
    icon: Activity,
    colour: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    subsections: [
      { label: "Care planning and assessment", status: "review", evidence: 11, action: "2 residents due Mental Capacity Act review", owner: "Ruth Manager" },
      { label: "Clinical monitoring (NEWS2)", status: "compliant", evidence: 18, action: "NEWS2 scores recorded daily for high-risk residents", owner: "Priya Nair" },
      { label: "Nutrition and hydration monitoring", status: "review", evidence: 7, action: "Margaret Ellis fluid balance flagged — monitoring weekly", owner: "Devon Deputy" },
      { label: "Staff training and competency", status: "compliant", evidence: 6, action: "88% overall training compliance; 2 refreshers pending", owner: "Devon Deputy" },
      { label: "Consent and decision making", status: "review", evidence: 4, action: "Capacity reviews due for 2 residents this week", owner: "Ruth Manager" },
    ],
  },
  {
    key: "Caring",
    icon: Heart,
    colour: "#db2777",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    subsections: [
      { label: "Dignity and respect", status: "compliant", evidence: 9, action: "SOFI observation completed — no concerns", owner: "Ruth Manager" },
      { label: "Resident involvement in care", status: "compliant", evidence: 7, action: "Care planning meetings held with residents and families", owner: "Devon Deputy" },
      { label: "Family and visitor engagement", status: "review", evidence: 5, action: "Family survey sample size thin — chase 4 responses", owner: "Ruth Manager" },
      { label: "End of life care", status: "compliant", evidence: 3, action: "1 resident on anticipatory care pathway; DNAR in place", owner: "Priya Nair" },
      { label: "Emotional and psychological support", status: "compliant", evidence: 4, action: "Activities coordinator in post; wellbeing records current", owner: "Devon Deputy" },
    ],
  },
  {
    key: "Responsive",
    icon: MessageSquare,
    colour: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    subsections: [
      { label: "Personalised care and support", status: "compliant", evidence: 13, action: "Life story documents updated for 10/12 residents", owner: "Devon Deputy" },
      { label: "Complaints and compliments", status: "concern", evidence: 6, action: "2 complaints open — closure evidence outstanding", owner: "Ruth Manager" },
      { label: "Activity provision and social inclusion", status: "compliant", evidence: 5, action: "Weekly activity schedule in place; good engagement", owner: "Devon Deputy" },
      { label: "Discharge and transitions", status: "compliant", evidence: 3, action: "Hospital discharge protocols followed; 1 recent readmission reviewed", owner: "Priya Nair" },
      { label: "Communication and information", status: "compliant", evidence: 4, action: "Care plans available in resident's preferred language", owner: "Ruth Manager" },
    ],
  },
  {
    key: "Well-led",
    icon: Building2,
    colour: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    subsections: [
      { label: "Governance and quality assurance", status: "review", evidence: 16, action: "Regulation 17 action plan — 3 owners to confirm closure", owner: "Ruth Manager" },
      { label: "Staff management and culture", status: "compliant", evidence: 9, action: "Supervision records current; no staff complaints", owner: "Devon Deputy" },
      { label: "Continuous improvement", status: "compliant", evidence: 11, action: "Service improvement register maintained; last audit March 2026", owner: "Ruth Manager" },
      { label: "External audits and notifications", status: "compliant", evidence: 7, action: "CQC notifications submitted within required timeframes", owner: "Ruth Manager" },
      { label: "Leadership visibility", status: "compliant", evidence: 9, action: "Registered manager present 5 days/week; deputy covers weekends", owner: "Devon Deputy" },
    ],
  },
];

const UPCOMING_ACTIONS = [
  { due: "26 Apr 2026", label: "Care plan review — Margaret Ellis", priority: "high", owner: "Ruth Manager" },
  { due: "24 Apr 2026", label: "Pressure care follow-up — Evelyn Morgan", priority: "high", owner: "Priya Nair" },
  { due: "03 May 2026", label: "Care plan review — George Patel", priority: "medium", owner: "Devon Deputy" },
  { due: "30 Apr 2026", label: "Complaints closure — INC-401 response", priority: "high", owner: "Ruth Manager" },
  { due: "10 May 2026", label: "Mental Capacity Act review — 2 residents", priority: "medium", owner: "Ruth Manager" },
  { due: "15 May 2026", label: "Family survey follow-up", priority: "low", owner: "Devon Deputy" },
];

const EVIDENCE_CATEGORIES = [
  { label: "Care notes (CQC-tagged)", count: 46, recent: "Today" },
  { label: "Medication administration records", count: 312, recent: "Today" },
  { label: "Incident reports and RCAs", count: 8, recent: "21 Apr 2026" },
  { label: "Staff training records", count: 27, recent: "15 Apr 2026" },
  { label: "Resident satisfaction surveys", count: 6, recent: "14 Mar 2026" },
  { label: "Audit reports (IPC, MAR, care plans)", count: 14, recent: "08 Apr 2026" },
  { label: "Regulation 17 meeting minutes", count: 5, recent: "01 Apr 2026" },
  { label: "Complaints correspondence", count: 4, recent: "18 Apr 2026" },
];

function statusIcon(status: string) {
  if (status === "compliant") return <CheckCircle2 size={14} style={{ color: "#16a34a", flexShrink: 0 }} />;
  if (status === "review") return <Clock size={14} style={{ color: "#d97706", flexShrink: 0 }} />;
  return <XCircle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />;
}

function statusBadge(status: string) {
  if (status === "compliant") return <span style={{ fontSize: 10, fontWeight: 800, background: "#ecfdf5", color: "#15803d", borderRadius: 999, padding: "2px 8px" }}>Compliant</span>;
  if (status === "review") return <span style={{ fontSize: 10, fontWeight: 800, background: "#fffbeb", color: "#b45309", borderRadius: 999, padding: "2px 8px" }}>Review needed</span>;
  return <span style={{ fontSize: 10, fontWeight: 800, background: "#fef2f2", color: "#b91c1c", borderRadius: 999, padding: "2px 8px" }}>Concern</span>;
}

function priorityBadge(p: string) {
  if (p === "high") return <span style={{ fontSize: 10, fontWeight: 800, background: "#fef2f2", color: "#b91c1c", borderRadius: 999, padding: "2px 8px" }}>High</span>;
  if (p === "medium") return <span style={{ fontSize: 10, fontWeight: 800, background: "#fffbeb", color: "#b45309", borderRadius: 999, padding: "2px 8px" }}>Medium</span>;
  return <span style={{ fontSize: 10, fontWeight: 800, background: "#f1f5f9", color: "#475569", borderRadius: 999, padding: "2px 8px" }}>Low</span>;
}

function ScoreBar({ score, colour }: { score: number; colour: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
      <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: colour, borderRadius: 999, transition: "width 600ms ease" }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", width: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score}%</span>
    </div>
  );
}

export default async function CqcPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/cqc");

  const overallScore = Math.round(cqc.reduce((s, item) => s + item.score, 0) / cqc.length);
  const overallRating = overallScore >= 90 ? "Outstanding" : overallScore >= 80 ? "Good" : overallScore >= 70 ? "Requires improvement" : "Inadequate";
  const ratingColour = overallScore >= 90 ? "#16a34a" : overallScore >= 80 ? "#2563eb" : overallScore >= 70 ? "#d97706" : "#dc2626";
  const concernCount = PIR_SECTIONS.flatMap((s) => s.subsections).filter((s) => s.status !== "compliant").length;
  const totalEvidence = EVIDENCE_CATEGORIES.reduce((t, c) => t + c.count, 0);

  return (
    <div className="stack">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="hero" style={{ background: "#0f172a", color: "#fff", borderColor: "#1e293b" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#60a5fa" }}>CQC readiness</span>
              <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(255,255,255,0.08)", color: "#94a3b8", borderRadius: 999, padding: "2px 8px" }}>
                {session.careHomeName ?? "Oakfield House"}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 26, color: "#fff", lineHeight: 1.1, letterSpacing: 0 }}>
              Provider Information Return (PIR)
            </h2>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
              CQC evidence register, key question scoring, and action plan tracker ·{" "}
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: ratingColour, lineHeight: 1 }}>{overallScore}%</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Overall score</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: ratingColour, marginTop: 2 }}>{overallRating}</div>
            </div>
            <button
              type="button"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--brand)", color: "#fff", border: 0, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Download size={14} /> Export PIR pack
            </button>
          </div>
        </div>

        {/* Five key question summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 4 }}>
          {PIR_SECTIONS.map((section) => {
            const kq = cqc.find((c) => c.key === section.key);
            const score = kq?.score ?? 0;
            const concernsInSection = section.subsections.filter((s) => s.status !== "compliant").length;
            return (
              <div key={section.key} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <section.icon size={13} style={{ color: section.colour, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#f1f5f9" }}>{section.key}</span>
                  {concernsInSection > 0 && (
                    <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 900, background: "rgba(239,68,68,0.15)", color: "#f87171", borderRadius: 999, padding: "1px 5px" }}>
                      {concernsInSection}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 999 }}>
                    <div style={{ width: `${score}%`, height: "100%", background: section.colour, borderRadius: 999 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#fff", width: 36, textAlign: "right" }}>{score}%</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 10, color: "#64748b", lineHeight: 1.4 }}>
                  {kq?.evidence} items · {kq?.risk}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick-action strip ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Evidence items", value: totalEvidence, sub: "Across all key questions", colour: "#2563eb" },
          { label: "Actions outstanding", value: concernCount, sub: "Require review or closure", colour: concernCount > 4 ? "#dc2626" : "#d97706" },
          { label: "Upcoming due dates", value: UPCOMING_ACTIONS.filter((a) => a.priority === "high").length, sub: "High-priority actions", colour: "#7c3aed" },
          { label: "Last evidence update", value: "Today", sub: "Care notes auto-tagged", colour: "#16a34a" },
        ].map((item) => (
          <div key={item.label} className="card" style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: item.colour, borderRadius: "8px 8px 0 0" }} />
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>{item.label}</p>
            <p style={{ margin: "4px 0 2px", fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>{item.value}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20, alignItems: "start" }}>

        {/* Left — Key question detail ────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 20 }}>
          {PIR_SECTIONS.map((section) => {
            const kq = cqc.find((c) => c.key === section.key);
            const score = kq?.score ?? 0;
            const Icon = section.icon;
            return (
              <div key={section.key} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Section header */}
                <div style={{ background: section.bg, borderBottom: `1px solid ${section.border}`, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: section.colour, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon size={18} style={{ color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{section.key}</h3>
                      <span style={{ fontSize: 11, fontWeight: 800, background: section.colour, color: "#fff", borderRadius: 999, padding: "2px 8px" }}>
                        {score}%
                      </span>
                      <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto" }}>{kq?.evidence} evidence items</span>
                    </div>
                    <ScoreBar score={score} colour={section.colour} />
                  </div>
                </div>

                {/* Subsections */}
                <div style={{ padding: "4px 0" }}>
                  {section.subsections.map((sub, i) => (
                    <div
                      key={sub.label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto auto",
                        gap: "10px 14px",
                        alignItems: "start",
                        padding: "13px 18px",
                        borderBottom: i < section.subsections.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}
                    >
                      {statusIcon(sub.status)}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{sub.label}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{sub.action}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 11, color: "#94a3b8" }}>
                          <ChevronRight size={10} /> Owner: {sub.owner} · {sub.evidence} evidence items
                        </p>
                      </div>
                      {statusBadge(sub.status)}
                      <button
                        type="button"
                        style={{ fontSize: 11, fontWeight: 800, background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#475569", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >
                        Add evidence
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right rail ───────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 16 }}>

          {/* Upcoming actions */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <AlertTriangle size={14} style={{ color: "var(--muted)" }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Upcoming actions</h3>
              <span style={{ background: "#fef2f2", color: "#b91c1c", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "2px 7px", marginLeft: "auto" }}>
                {UPCOMING_ACTIONS.filter((a) => a.priority === "high").length} high
              </span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {UPCOMING_ACTIONS.map((action) => (
                <div
                  key={action.label}
                  style={{
                    display: "grid",
                    gap: 4,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: action.priority === "high" ? "#fef2f2" : action.priority === "medium" ? "#fffbeb" : "#f8fafc",
                    border: `1px solid ${action.priority === "high" ? "#fca5a5" : action.priority === "medium" ? "#fde68a" : "#e2e8f0"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    {priorityBadge(action.priority)}
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{action.due}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>{action.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{action.owner}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence register */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <FileText size={14} style={{ color: "var(--muted)" }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Evidence register</h3>
              <span style={{ background: "var(--brand-soft)", color: "var(--brand)", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "2px 7px", marginLeft: "auto" }}>
                {totalEvidence} items
              </span>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {EVIDENCE_CATEGORIES.map((cat) => (
                <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{cat.label}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{cat.recent}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "var(--muted)", width: 28, textAlign: "right", flexShrink: 0 }}>{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload evidence */}
          <div className="card" style={{ border: "2px dashed var(--card-border)", background: "#fafbfc", textAlign: "center", padding: "20px 16px" }}>
            <Upload size={20} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#334155" }}>Upload evidence documents</p>
            <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#94a3b8" }}>PDF, Word, Excel accepted · auto-tagged by key question</p>
            <button
              type="button"
              className="btn"
              style={{ width: "100%" }}
            >
              Choose files
            </button>
          </div>

          {/* PIR submission status */}
          <div className="card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={14} style={{ color: "var(--muted)" }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>PIR submission status</h3>
            </div>
            {[
              { label: "Service details", done: true },
              { label: "Safe — evidence attached", done: true },
              { label: "Effective — evidence attached", done: true },
              { label: "Caring — family responses", done: false },
              { label: "Responsive — complaints closed", done: false },
              { label: "Well-led — Reg 17 owners confirmed", done: false },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                {item.done
                  ? <CheckCircle2 size={14} style={{ color: "#16a34a", flexShrink: 0 }} />
                  : <Clock size={14} style={{ color: "#d97706", flexShrink: 0 }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: item.done ? "#0f172a" : "#64748b" }}>{item.label}</span>
              </div>
            ))}
            <button
              type="button"
              className="btn primary"
              style={{ width: "100%", marginTop: 14 }}
            >
              <Download size={13} />
              Export CQC PIR pack
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
