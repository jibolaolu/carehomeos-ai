"use client";

import { useEffect, useState } from "react";
import {
  listSafeguardingCases,
  createEvidencePack,
  generateEvidencePack,
  listEvidencePacks,
  type SafeguardingCase,
  type EvidencePack,
} from "../../../lib/api-client";

export default function EvidencePacksClient() {
  const [cases, setCases] = useState<SafeguardingCase[]>([]);
  const [packs, setPacks] = useState<EvidencePack[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [casesRes, packsRes] = await Promise.all([
      listSafeguardingCases({ pageSize: 50 }),
      listEvidencePacks({ pageSize: 20 }),
    ]);
    setCases(casesRes.items);
    setPacks(packsRes.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!selectedCaseId || !dateFrom || !dateTo) return;
    setCreating(true);
    const pack = await createEvidencePack({
      safeguardingCaseId: selectedCaseId,
      packType: "safeguarding_review",
      dateFrom: new Date(dateFrom).toISOString(),
      dateTo: new Date(dateTo).toISOString(),
    });
    await generateEvidencePack(pack.id);
    setCreating(false);
    await load();
  };

  return (
    <section className="stack">
      <div className="hero">
        <span className="badge warning">Evidence packs</span>
        <h2 className="pageTitle">Safeguarding evidence bundles</h2>
        <p className="pageLead">Assemble PDF and ZIP evidence packs from incidents, care notes, alerts, Section 42 drafts and risk patterns.</p>
      </div>

      <section className="card">
        <h3>Create evidence pack</h3>
        <div className="formStack">
          <select
            className="input"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select safeguarding case</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.reference}
              </option>
            ))}
          </select>
          <div className="formRow">
            <label className="label">
              From
              <input
                className="input"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="label">
              To
              <input
                className="input"
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
          <button className="btn primary" onClick={handleCreate} disabled={!selectedCaseId || !dateFrom || !dateTo || creating} type="button">
            {creating ? "Building pack…" : "Create and generate pack"}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Generated packs</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : packs.length === 0 ? (
          <p className="muted">No evidence packs yet.</p>
        ) : (
          <ul className="packList">
            {packs.map((p) => (
              <li key={p.id} className="packRow">
                <div className="packMeta">
                  <strong>{p.reference}</strong>
                  <span className={`badge ${p.status === "completed" ? "success" : p.status === "failed" ? "danger" : "warning"}`}>
                    {p.status}
                  </span>
                  <span className="muted">{p.packType}</span>
                </div>
                <p className="muted">
                  {new Date(p.dateFrom).toLocaleString()} → {new Date(p.dateTo).toLocaleString()}
                </p>
                {p.status === "completed" && p.s3KeyPdf ? (
                  <a
                    className="btn small"
                    href={`/api/v1/safeguarding/evidence-packs/${p.id}/download?format=zip`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download ZIP
                  </a>
                ) : null}
                {p.errorMessage ? <p className="badge danger">{p.errorMessage}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
