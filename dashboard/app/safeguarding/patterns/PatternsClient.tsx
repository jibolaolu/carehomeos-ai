"use client";

import { useEffect, useState } from "react";
import {
  listResidents,
  detectPatterns,
  listRiskPatterns,
  listPatternSignals,
  type Resident,
  type RiskPattern,
  type PatternSignal,
} from "../../../lib/api-client";

export default function PatternsClient() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [patterns, setPatterns] = useState<RiskPattern[]>([]);
  const [signals, setSignals] = useState<PatternSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [residentsRes, patternsRes, signalsRes] = await Promise.all([
      listResidents({ pageSize: 200 }),
      listRiskPatterns({ pageSize: 20 }),
      listPatternSignals({ pageSize: 50 }),
    ]);
    setResidents(residentsRes.items);
    setPatterns(patternsRes.items);
    setSignals(signalsRes.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDetect = async () => {
    if (!selectedResidentId) return;
    setDetecting(true);
    await detectPatterns({ residentId: selectedResidentId, timeWindowDays: 30 });
    setDetecting(false);
    await load();
  };

  return (
    <section className="stack">
      <div className="hero">
        <span className="badge warning">Pattern detection</span>
        <h2 className="pageTitle">Longitudinal risk analysis</h2>
        <p className="pageLead">Run multi-source pattern detection across incidents, care notes, vitals, fluids, wounds and nutrition.</p>
      </div>

      <section className="card">
        <h3>Detect patterns for resident</h3>
        <div className="formRow">
          <select
            className="input"
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select resident</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.room}
              </option>
            ))}
          </select>
          <button className="btn primary" onClick={handleDetect} disabled={!selectedResidentId || detecting} type="button">
            {detecting ? "Analysing…" : "Detect patterns"}
          </button>
        </div>
      </section>

      <div className="twoCol">
        <section className="card">
          <h3>Risk patterns</h3>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : patterns.length === 0 ? (
            <p className="muted">No patterns detected yet.</p>
          ) : (
            <ul className="patternList">
              {patterns.map((p) => (
                <li key={p.id} className="patternRow">
                  <div className="patternMeta">
                    <strong>{p.patternType}</strong>
                    <span className={`badge ${p.severity === "critical" || p.severity === "high" ? "danger" : "warning"}`}>
                      {p.severity}
                    </span>
                    <span className="muted">{p.category}</span>
                  </div>
                  <p>{p.summary}</p>
                  <p className="muted">Confidence: {Math.round(p.confidence * 100)}%</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3>Recent signals</h3>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : signals.length === 0 ? (
            <p className="muted">No signals yet.</p>
          ) : (
            <ul className="signalList">
              {signals.map((s) => (
                <li key={s.id} className="signalRow">
                  <div className="signalMeta">
                    <strong>{s.signalType}</strong>
                    <span className="badge">{s.sourceType}</span>
                    <span className="muted">{Math.round(s.confidence * 100)}%</span>
                  </div>
                  <p className="muted">{s.evidenceText}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
