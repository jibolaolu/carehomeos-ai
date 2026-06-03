"use client";

import { useState } from "react";
import { fetchApi } from "../../lib/api-base";

const reportingTypes = [
  { id: "general", label: "Care note", noteType: "general" },
  { id: "incident", label: "Incident", noteType: "incident" },
  { id: "falls", label: "Falls observation", noteType: "falls" },
  { id: "nutrition", label: "Nutrition and hydration", noteType: "nutrition" },
  { id: "medication", label: "Medication concern", noteType: "medication" },
  { id: "family", label: "Family update draft", noteType: "family" },
];

export default function StaffReportingClient() {
  const [selected, setSelected] = useState(reportingTypes[0]);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateNote = async () => {
    if (!transcript.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchApi<{
        note: { summary?: string; actions?: string[] };
      }>("/care-notes/generate", {
        method: "POST",
        body: JSON.stringify({
          resident_id: "res-001",
          transcript,
          note_type: selected.noteType,
        }),
      });
      const summary = response.note?.summary ?? JSON.stringify(response.note, null, 2);
      setResult(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Staff reporting</p>
          <h1 className="pageTitle">Care staff reporting entry</h1>
          <p className="pageLead">
            Draft structured care notes with AI assistance. Submissions route through the care-notes API with CQC tagging and quality checks.
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="sectionTitle">Report type</h2>
        <div className="grid" style={{ marginTop: 12 }}>
          {reportingTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={selected.id === type.id ? "btn primary" : "btn"}
              onClick={() => setSelected(type)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="sectionTitle">Draft {selected.label.toLowerCase()}</h2>
        <textarea
          rows={6}
          placeholder="Describe what you observed…"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          style={{ width: "100%", marginTop: 12, padding: 12, borderRadius: 8, border: "1px solid var(--card-border)" }}
        />
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn primary" type="button" onClick={() => void generateNote()} disabled={loading}>
            {loading ? "Generating…" : "Generate structured note"}
          </button>
        </div>
        {error ? <p style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p> : null}
        {result ? (
          <div className="notice" style={{ marginTop: 16 }}>
            <strong>AI draft</strong>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{result}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
