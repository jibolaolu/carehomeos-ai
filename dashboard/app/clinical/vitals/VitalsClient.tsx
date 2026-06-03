"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ChartCard from "../../../components/ChartCard";
import FormField from "../../../components/FormField";
import NEWS2Display from "../../../components/NEWS2Display";
import DataTable from "../../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { createClinicalVitals, listClinicalVitals } from "../../../lib/api-client";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const vitalsSchema = z.object({
  residentId: z.string().min(1, "Select a resident"),
  respirationRate: z.coerce.number().min(4).max(60),
  oxygenSaturation: z.coerce.number().min(70).max(100),
  temperature: z.coerce.number().min(30).max(44),
  systolicBP: z.coerce.number().min(60).max(260),
  diastolicBP: z.coerce.number().min(30).max(160),
  pulse: z.coerce.number().min(30).max(200),
  consciousness: z.enum(["A", "V", "P", "U"]),
  supplementalO2: z.boolean(),
});

type VitalsForm = z.infer<typeof vitalsSchema>;

interface VitalsRecord {
  id: string;
  resident: string;
  recordedAt: string;
  news2: number;
}

const vitalsColumns: ColumnDef<VitalsRecord>[] = [
  { accessorKey: "resident", header: "Resident" },
  { accessorKey: "recordedAt", header: "Recorded" },
  {
    accessorKey: "news2",
    header: "NEWS2",
    cell: (info) => (
      <span
        className="badge"
        style={{
          background: (info.getValue() as number) >= 7 ? "#fecaca" : (info.getValue() as number) >= 5 ? "#fde68a" : "#d8f5e3",
          color: "#0f172a",
        }}
      >
        {info.getValue() as number}
      </span>
    ),
  },
];

const bpData = [
  { time: "08:00", systolic: 138, diastolic: 84 },
  { time: "12:00", systolic: 132, diastolic: 80 },
  { time: "16:00", systolic: 128, diastolic: 78 },
  { time: "20:00", systolic: 130, diastolic: 82 },
];

const pulseData = [
  { time: "08:00", pulse: 72 },
  { time: "12:00", pulse: 68 },
  { time: "16:00", pulse: 70 },
  { time: "20:00", pulse: 74 },
];

const tempData = [
  { time: "08:00", temp: 36.6 },
  { time: "12:00", temp: 36.8 },
  { time: "16:00", temp: 37.1 },
  { time: "20:00", temp: 36.7 },
];

const spo2Data = [
  { time: "08:00", spo2: 97 },
  { time: "12:00", spo2: 96 },
  { time: "16:00", spo2: 95 },
  { time: "20:00", spo2: 97 },
];

function computeNews2(values: VitalsForm): number {
  let score = 0;
  if (values.respirationRate <= 8 || values.respirationRate >= 25) score += 3;
  else if (values.respirationRate >= 21) score += 2;
  else if (values.respirationRate >= 9 && values.respirationRate <= 11) score += 1;

  if (values.oxygenSaturation <= 91) score += 3;
  else if (values.oxygenSaturation <= 93) score += 2;
  else if (values.oxygenSaturation <= 95) score += 1;

  if (values.temperature <= 35.0) score += 3;
  else if (values.temperature >= 39.1) score += 2;
  else if (values.temperature >= 38.1 || (values.temperature >= 35.1 && values.temperature <= 36.0)) score += 1;

  if (values.systolicBP <= 90 || values.systolicBP >= 220) score += 3;
  else if (values.systolicBP >= 181) score += 2;
  else if (values.systolicBP >= 91 && values.systolicBP <= 100) score += 1;
  else if (values.systolicBP >= 101 && values.systolicBP <= 110) score += 1;

  if (values.pulse <= 40 || values.pulse >= 131) score += 3;
  else if (values.pulse >= 111) score += 2;
  else if (values.pulse >= 41 && values.pulse <= 50) score += 1;
  else if (values.pulse >= 91 && values.pulse <= 110) score += 1;

  if (values.consciousness !== "A") score += 3;
  if (values.supplementalO2) score += 2;

  return score;
}

export default function VitalsClient() {
  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [latest, setLatest] = useState<VitalsForm | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const residentNames: Record<string, string> = {
    "res-001": "Margaret Ellis",
    "res-002": "George Patel",
    "res-003": "Evelyn Morgan",
  };

  useEffect(() => {
    listClinicalVitals()
      .then((items) => {
        setRecords(
          items.map((item) => ({
            id: item.id,
            resident: residentNames[item.resident_id] ?? item.resident_id,
            recordedAt: item.recorded_at?.slice(0, 16).replace("T", " ") ?? "—",
            news2: item.news2_score ?? 0,
          })),
        );
      })
      .catch((err) => setApiError(err instanceof Error ? err.message : "Could not load vitals"));
  }, []);

  const { control, handleSubmit, reset, watch } = useForm<VitalsForm>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      residentId: "",
      respirationRate: 16,
      oxygenSaturation: 97,
      temperature: 36.6,
      systolicBP: 130,
      diastolicBP: 80,
      pulse: 72,
      consciousness: "A",
      supplementalO2: false,
    },
  });

  const values = watch();
  const previewScore = computeNews2(values);

  const onSubmit = async (data: VitalsForm) => {
    const residentName = residentNames[data.residentId] ?? data.residentId;
    const score = computeNews2(data);
    try {
      setApiError(null);
      const created = await createClinicalVitals({
        resident_id: data.residentId,
        respiration_rate: data.respirationRate,
        spo2_percent: data.oxygenSaturation,
        temperature_celsius: data.temperature,
        systolic_bp: data.systolicBP,
        diastolic_bp: data.diastolicBP,
        pulse_rate: data.pulse,
        consciousness_level: data.consciousness,
        supplemental_oxygen: data.supplementalO2,
      });
      setRecords((prev) => [
        {
          id: created.id,
          resident: residentName,
          recordedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
          news2: created.news2_score ?? score,
        },
        ...prev,
      ]);
      setLatest(data);
      reset();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to save vitals");
      setRecords((prev) => [
        { id: crypto.randomUUID(), resident: residentName, recordedAt: new Date().toISOString().slice(0, 16).replace("T", " "), news2: score },
        ...prev,
      ]);
      setLatest(data);
      reset();
    }
  };

  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Vital signs</h1>
          <p className="pageLead">Record observations, view NEWS2 scores, and track trends.</p>
          {apiError ? <p className="muted" style={{ color: "var(--danger)" }}>{apiError}</p> : null}
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <h3 className="sectionTitle">New entry</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="stack" style={{ marginTop: 12 }}>
              <div className="formGrid">
                <FormField
                  name="residentId"
                  control={control}
                  label="Resident"
                  type="select"
                  options={[
                    { value: "res-001", label: "Margaret Ellis" },
                    { value: "res-002", label: "George Patel" },
                    { value: "res-003", label: "Evelyn Morgan" },
                  ]}
                />
                <FormField name="respirationRate" control={control} label="Respiration (/min)" type="number" />
                <FormField name="oxygenSaturation" control={control} label="SpO₂ (%)" type="number" />
                <FormField name="temperature" control={control} label="Temperature (°C)" type="number" step={0.1} />
                <FormField name="systolicBP" control={control} label="Systolic BP" type="number" />
                <FormField name="diastolicBP" control={control} label="Diastolic BP" type="number" />
                <FormField name="pulse" control={control} label="Pulse (/min)" type="number" />
                <FormField
                  name="consciousness"
                  control={control}
                  label="Consciousness"
                  type="select"
                  options={[
                    { value: "A", label: "Alert (A)" },
                    { value: "V", label: "Voice (V)" },
                    { value: "P", label: "Pain (P)" },
                    { value: "U", label: "Unresponsive (U)" },
                  ]}
                />
                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" {...control.register("supplementalO2")} />
                    <span>Supplemental O₂</span>
                  </label>
                </div>
              </div>
              <div className="actions">
                <button type="submit" className="btn primary">Record vitals</button>
                <span className="badge">Preview NEWS2: {previewScore}</span>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 className="sectionTitle">History</h3>
            <DataTable data={records} columns={vitalsColumns} pageSize={5} />
          </div>

          <div className="chartGrid">
            <ChartCard title="Blood pressure" subtitle="Systolic / Diastolic">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bpData}>
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--card-border)" }} />
                  <Line type="monotone" dataKey="systolic" stroke="#c9364d" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="diastolic" stroke="#2f84cc" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Pulse" subtitle="BPM over time">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={pulseData}>
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--card-border)" }} />
                  <Line type="monotone" dataKey="pulse" stroke="#5b4df2" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Temperature" subtitle="°C over time">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={tempData}>
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[35, 40]} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--card-border)" }} />
                  <Line type="monotone" dataKey="temp" stroke="#b98208" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="SpO₂" subtitle="% over time">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={spo2Data}>
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[90, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--card-border)" }} />
                  <Line type="monotone" dataKey="spo2" stroke="#159947" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        <div style={{ maxWidth: 380 }}>
          {latest ? (
            <NEWS2Display
              params={{
                respirationRate: latest.respirationRate,
                oxygenSaturation: latest.oxygenSaturation,
                temperature: latest.temperature,
                systolicBP: latest.systolicBP,
                pulse: latest.pulse,
                consciousness: latest.consciousness,
                supplementalO2: latest.supplementalO2,
              }}
              score={computeNews2(latest)}
              escalation={computeNews2(latest) >= 7 ? "Urgent clinical review required" : computeNews2(latest) >= 5 ? "Inform nurse in charge" : "Continue routine monitoring"}
            />
          ) : (
            <div className="card">
              <p className="muted" style={{ fontSize: 13 }}>Record vitals to see NEWS2 breakdown.</p>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="sectionTitle">Escalation history</h3>
            <ul className="list" style={{ marginTop: 8 }}>
              <li className="listItem">
                <span>Evelyn Morgan — NEWS2 5</span>
                <span className="badge warning">Nurse informed</span>
              </li>
              <li className="listItem">
                <span>Margaret Ellis — NEWS2 2</span>
                <span className="badge success">Routine</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
