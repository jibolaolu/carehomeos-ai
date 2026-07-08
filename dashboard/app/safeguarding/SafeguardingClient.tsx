"use client";

import { useEffect, useState } from "react";
import {
  listSafeguardingAlerts,
  listSafeguardingCases,
  acknowledgeAlert,
  createSafeguardingCase,
  type SafeguardingAlert,
  type SafeguardingCase,
} from "../../lib/api-client";

export default function SafeguardingClient() {
  const [alerts, setAlerts] = useState<SafeguardingAlert[]>([]);
  const [cases, setCases] = useState<SafeguardingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [alertsRes, casesRes] = await Promise.all([
        listSafeguardingAlerts({ pageSize: 20 }),
        listSafeguardingCases({ pageSize: 20 }),
      ]);
      setAlerts(alertsRes.items);
      setCases(casesRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    await load();
  };

  const handleCreateCase = async () => {
    await createSafeguardingCase({});
    await load();
  };

  return (
    <section className="stack">
      <div className="hero">
        <span className="badge warning">SafeguardingOS</span>
        <h2 className="pageTitle">Safeguarding alerts and cases</h2>
        <p className="pageLead">Review AI-detected alerts, manage safeguarding cases, and escalate to Section 42 enquiries.</p>
      </div>

      {error ? <div className="badge danger">{error}</div> : null}

      <div className="twoCol">
        <section className="card">
          <div className="sectionHeader">
            <h3>Open alerts</h3>
            <button className="btn" onClick={load} type="button">Refresh</button>
          </div>
          {loading ? (
            <p className="muted">Loading alerts…</p>
          ) : alerts.length === 0 ? (
            <p className="muted">No open alerts.</p>
          ) : (
            <ul className="alertList">
              {alerts.map((alert) => (
                <li key={alert.id} className="alertRow">
                  <div className="alertMeta">
                    <span className={`badge ${alert.severity === "critical" || alert.severity === "high" ? "danger" : "warning"}`}>
                      {alert.severity}
                    </span>
                    <span className="badge">{alert.category}</span>
                    <span className="muted">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="alertTitle">{alert.title}</p>
                  <p className="muted">{alert.description}</p>
                  {alert.status === "open" ? (
                    <button className="btn small" onClick={() => handleAcknowledge(alert.id)} type="button">
                      Acknowledge
                    </button>
                  ) : (
                    <span className="badge success">{alert.status}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="sectionHeader">
            <h3>Safeguarding cases</h3>
            <button className="btn primary" onClick={handleCreateCase} type="button">Create case</button>
          </div>
          {loading ? (
            <p className="muted">Loading cases…</p>
          ) : cases.length === 0 ? (
            <p className="muted">No cases yet.</p>
          ) : (
            <ul className="caseList">
              {cases.map((c) => (
                <li key={c.id} className="caseRow">
                  <div className="caseMeta">
                    <strong>{c.reference}</strong>
                    <span className={`badge ${c.riskLevel === "critical" || c.riskLevel === "high" ? "danger" : "warning"}`}>
                      {c.riskLevel || "unknown"}
                    </span>
                    <span className="badge">{c.status}</span>
                  </div>
                  <p className="muted">Opened {new Date(c.openedAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
