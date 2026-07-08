"use client";

import { useEffect, useState } from "react";
import {
  listSafeguardingCases,
  generateSection42,
  listSection42Enquiries,
  type SafeguardingCase,
  type Section42Enquiry,
} from "../../../lib/api-client";

export default function Section42Client() {
  const [cases, setCases] = useState<SafeguardingCase[]>([]);
  const [enquiries, setEnquiries] = useState<Section42Enquiry[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [casesRes, enquiriesRes] = await Promise.all([
      listSafeguardingCases({ pageSize: 50 }),
      listSection42Enquiries({ pageSize: 20 }),
    ]);
    setCases(casesRes.items);
    setEnquiries(enquiriesRes.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    if (!selectedCaseId) return;
    setGenerating(true);
    await generateSection42({ safeguardingCaseId: selectedCaseId });
    setGenerating(false);
    await load();
  };

  return (
    <section className="stack">
      <div className="hero">
        <span className="badge warning">Section 42</span>
        <h2 className="pageTitle">Care Act 2014 enquiry generator</h2>
        <p className="pageLead">Generate structured Section 42 enquiry drafts from case evidence using AI.</p>
      </div>

      <section className="card">
        <h3>Generate new enquiry</h3>
        <div className="formRow">
          <select
            className="input"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select safeguarding case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.reference} {c.residentId ? `(Resident ${c.residentId})` : ""}
              </option>
            ))}
          </select>
          <button className="btn primary" onClick={handleGenerate} disabled={!selectedCaseId || generating} type="button">
            {generating ? "Generating…" : "Generate draft"}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Generated enquiries</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : enquiries.length === 0 ? (
          <p className="muted">No enquiries yet.</p>
        ) : (
          <ul className="enquiryList">
            {enquiries.map((e) => (
              <li key={e.id} className="enquiryRow">
                <div className="enquiryMeta">
                  <strong>{e.reference}</strong>
                  <span className="badge">{e.status}</span>
                  <span className="muted">{e.fallbackUsed ? "Fallback" : e.modelName || "AI"}</span>
                </div>
                <p className="enquirySummary">{e.summary}</p>
                <details>
                  <summary>View draft</summary>
                  <div className="enquiryBody">
                    <h4>Risks</h4>
                    <p className="muted">{e.risks}</p>
                    <h4>Evidence</h4>
                    <p className="muted">{e.evidence}</p>
                    <h4>Capacity considerations</h4>
                    <p className="muted">{e.capacityConsiderations}</p>
                    <h4>Recommended outcomes</h4>
                    <p className="muted">{e.recommendedOutcomes}</p>
                    <h4>Narrative</h4>
                    <p className="muted">{e.narrative}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
