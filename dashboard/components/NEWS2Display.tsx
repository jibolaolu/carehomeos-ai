"use client";

interface NEWS2Params {
  respirationRate: number;
  oxygenSaturation: number;
  temperature: number;
  systolicBP: number;
  pulse: number;
  consciousness: "A" | "V" | "P" | "U";
  supplementalO2: boolean;
}

interface NEWS2DisplayProps {
  params: NEWS2Params;
  score: number;
  escalation?: string;
}

function scoreClass(score: number) {
  if (score === 0) return { label: "Low", className: "badge success" };
  if (score <= 4) return { label: "Low", className: "badge success" };
  if (score <= 6) return { label: "Medium", className: "badge warning" };
  return { label: "High", className: "badge danger" };
}

function paramScore(label: string, value: string | number, points: number) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 8,
        background: points >= 3 ? "#fef2f2" : points >= 2 ? "#fffbeb" : "#f8fafc",
        border: `1px solid ${points >= 3 ? "#fecaca" : points >= 2 ? "#fde68a" : "#e2e8f0"}`,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{value}</span>
        <span
          className="badge"
          style={{
            background: points >= 3 ? "#fecaca" : points >= 2 ? "#fde68a" : "#e2e8f0",
            color: "#0f172a",
          }}
        >
          {points}
        </span>
      </span>
    </div>
  );
}

export default function NEWS2Display({ params, score, escalation }: NEWS2DisplayProps) {
  const risk = scoreClass(score);

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 className="sectionTitle" style={{ margin: 0 }}>NEWS2 Score</h3>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
            National Early Warning Score 2
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="metricValue" style={{ fontSize: 42 }}>{score}</div>
          <span className={risk.className}>{risk.label} risk</span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {paramScore("Respiration rate", `${params.respirationRate} /min`, news2Respiration(params.respirationRate))}
        {paramScore("SpO₂", `${params.oxygenSaturation}%`, news2SpO2(params.oxygenSaturation))}
        {paramScore("Temperature", `${params.temperature}°C`, news2Temperature(params.temperature))}
        {paramScore("Systolic BP", `${params.systolicBP} mmHg`, news2SystolicBP(params.systolicBP))}
        {paramScore("Pulse", `${params.pulse} /min`, news2Pulse(params.pulse))}
        {paramScore("Consciousness", params.consciousness, params.consciousness === "A" ? 0 : 3)}
        {paramScore("Supplemental O₂", params.supplementalO2 ? "Yes" : "No", params.supplementalO2 ? 2 : 0)}
      </div>

      {escalation ? (
        <div className="notice" style={{ borderColor: score >= 7 ? "#fecaca" : undefined, background: score >= 7 ? "#fef2f2" : undefined }}>
          <strong>Escalation action</strong>
          <p style={{ margin: "4px 0 0" }}>{escalation}</p>
        </div>
      ) : null}
    </div>
  );
}

function news2Respiration(value: number) {
  if (value <= 8 || value >= 25) return 3;
  if (value >= 21) return 2;
  if (value >= 9 && value <= 11) return 1;
  return 0;
}

function news2SpO2(value: number) {
  if (value <= 91) return 3;
  if (value <= 93) return 2;
  if (value <= 95) return 1;
  return 0;
}

function news2Temperature(value: number) {
  if (value <= 35.0) return 3;
  if (value >= 39.1) return 2;
  if (value >= 38.1 || (value >= 35.1 && value <= 36.0)) return 1;
  return 0;
}

function news2SystolicBP(value: number) {
  if (value <= 90 || value >= 220) return 3;
  if (value >= 181) return 2;
  if (value >= 91 && value <= 100) return 1;
  if (value >= 101 && value <= 110) return 1;
  return 0;
}

function news2Pulse(value: number) {
  if (value <= 40 || value >= 131) return 3;
  if (value >= 111) return 2;
  if (value >= 41 && value <= 50) return 1;
  if (value >= 91 && value <= 110) return 1;
  return 0;
}
