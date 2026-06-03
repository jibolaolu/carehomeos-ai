"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "../../../components/FormField";
import DataTable from "../../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

const mustSchema = z.object({
  residentId: z.string().min(1, "Select a resident"),
  bmi: z.coerce.number().min(10).max(60),
  weightLoss: z.coerce.number().min(0).max(100),
  acuteDisease: z.boolean(),
  intake: z.enum(["none", "poor", "reduced", "normal"]),
  plan: z.string().optional(),
  supplement: z.string().optional(),
  referred: z.boolean(),
});

type MustForm = z.infer<typeof mustSchema>;

interface NutritionRecord {
  id: string;
  resident: string;
  mustScore: number;
  risk: string;
  plan: string;
  supplement: string;
  referred: boolean;
  date: string;
}

const columns: ColumnDef<NutritionRecord>[] = [
  { accessorKey: "resident", header: "Resident" },
  {
    accessorKey: "mustScore",
    header: "MUST",
    cell: (info) => (
      <span
        className="badge"
        style={{
          background: (info.getValue() as number) >= 2 ? "#fecaca" : "#d8f5e3",
          color: "#0f172a",
        }}
      >
        {info.getValue() as number}
      </span>
    ),
  },
  {
    accessorKey: "risk",
    header: "Risk",
    cell: (info) => (
      <span className={(info.getValue() as string) === "High" ? "badge danger" : (info.getValue() as string) === "Medium" ? "badge warning" : "badge success"}>
        {info.getValue() as string}
      </span>
    ),
  },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "date", header: "Date" },
];

function computeMustScore(data: MustForm): number {
  let score = 0;
  if (data.bmi < 20) score += 1;
  if (data.weightLoss > 5) score += 1;
  if (data.acuteDisease) score += 2;
  if (data.intake === "none" || data.intake === "poor") score += 2;
  else if (data.intake === "reduced") score += 1;
  return score;
}

function riskLabel(score: number) {
  if (score >= 2) return "High";
  if (score === 1) return "Medium";
  return "Low";
}

export default function NutritionClient() {
  const [records, setRecords] = useState<NutritionRecord[]>([
    { id: "n1", resident: "Margaret Ellis", mustScore: 2, risk: "High", plan: "Fortified diet + snacks", supplement: "Fortisip", referred: true, date: "2026-05-10" },
  ]);

  const { control, handleSubmit, reset, watch } = useForm<MustForm>({
    resolver: zodResolver(mustSchema),
    defaultValues: { residentId: "", bmi: 22, weightLoss: 0, acuteDisease: false, intake: "normal", plan: "", supplement: "", referred: false },
  });

  const values = watch();
  const previewScore = computeMustScore(values);

  const onSubmit = (data: MustForm) => {
    const residentName = data.residentId === "res-001" ? "Margaret Ellis" : data.residentId === "res-002" ? "George Patel" : "Evelyn Morgan";
    const score = computeMustScore(data);
    setRecords((prev) => [
      {
        id: crypto.randomUUID(),
        resident: residentName,
        mustScore: score,
        risk: riskLabel(score),
        plan: data.plan ?? "",
        supplement: data.supplement ?? "",
        referred: data.referred,
        date: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    reset();
  };

  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Nutrition</h1>
          <p className="pageLead">MUST scoring, nutrition plans, supplement tracking, and referrals.</p>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <h3 className="sectionTitle">MUST assessment</h3>
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
                <FormField name="bmi" control={control} label="BMI" type="number" step={0.1} />
                <FormField name="weightLoss" control={control} label="Weight loss % (6mo)" type="number" step={0.1} />
                <FormField
                  name="intake"
                  control={control}
                  label="Intake"
                  type="select"
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "reduced", label: "Reduced" },
                    { value: "poor", label: "Poor" },
                    { value: "none", label: "None" },
                  ]}
                />
                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" {...control.register("acuteDisease")} />
                    <span>Acute disease effect</span>
                  </label>
                </div>
                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" {...control.register("referred")} />
                    <span>Dietitian referred</span>
                  </label>
                </div>
                <FormField name="plan" control={control} label="Nutrition plan" placeholder="e.g. Fortified diet" />
                <FormField name="supplement" control={control} label="Supplement" placeholder="e.g. Fortisip" />
              </div>
              <div className="actions">
                <button type="submit" className="btn primary">Save assessment</button>
                <span className="badge">Preview MUST: {previewScore}</span>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 className="sectionTitle">Assessments</h3>
            <DataTable data={records} columns={columns} pageSize={5} />
          </div>
        </div>

        <div style={{ maxWidth: 380 }}>
          <div className="card">
            <h3 className="sectionTitle">Supplement tracking</h3>
            <ul className="list" style={{ marginTop: 8 }}>
              {records
                .filter((r) => r.supplement)
                .map((r) => (
                  <li key={r.id} className="listItem">
                    <span>
                      <strong>{r.resident}</strong>
                      <br />
                      <small className="muted">{r.supplement}</small>
                    </span>
                    <span className={r.referred ? "badge" : "badge warning"}>{r.referred ? "Referred" : "Not referred"}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
