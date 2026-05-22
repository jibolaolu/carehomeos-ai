"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "../../../components/FormField";
import DataTable from "../../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

const eolSchema = z.object({
  residentId: z.string().min(1, "Select a resident"),
  dnarStatus: z.enum(["confirmed", "discussed", "pending"]),
  anticipatoryMeds: z.string().optional(),
  symptom: z.string().min(1, "Enter symptom"),
  intervention: z.string().min(1, "Enter intervention"),
});

type EolForm = z.infer<typeof eolSchema>;

interface EolRecord {
  id: string;
  resident: string;
  dnarStatus: string;
  anticipatoryMeds: string;
  symptom: string;
  intervention: string;
  date: string;
}

const columns: ColumnDef<EolRecord>[] = [
  { accessorKey: "resident", header: "Resident" },
  {
    accessorKey: "dnarStatus",
    header: "DNAR",
    cell: (info) => {
      const v = info.getValue() as string;
      return <span className={v === "confirmed" ? "badge danger" : v === "discussed" ? "badge warning" : "badge"}>{v}</span>;
    },
  },
  { accessorKey: "symptom", header: "Symptom" },
  { accessorKey: "intervention", header: "Intervention" },
  { accessorKey: "date", header: "Date" },
];

export default function EolPage() {
  const [records, setRecords] = useState<EolRecord[]>([
    { id: "e1", resident: "Evelyn Morgan", dnarStatus: "confirmed", anticipatoryMeds: "Morphine, Midazolam", symptom: "Pain", intervention: "Oral morphine 2.5mg PRN", date: "2026-05-18" },
  ]);

  const { control, handleSubmit, reset } = useForm<EolForm>({
    resolver: zodResolver(eolSchema),
    defaultValues: { residentId: "", dnarStatus: "pending", anticipatoryMeds: "", symptom: "", intervention: "" },
  });

  const onSubmit = (data: EolForm) => {
    const residentName = data.residentId === "res-001" ? "Margaret Ellis" : data.residentId === "res-002" ? "George Patel" : "Evelyn Morgan";
    setRecords((prev) => [
      {
        id: crypto.randomUUID(),
        resident: residentName,
        dnarStatus: data.dnarStatus,
        anticipatoryMeds: data.anticipatoryMeds ?? "",
        symptom: data.symptom,
        intervention: data.intervention,
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
          <h1 className="pageTitle">End-of-life care</h1>
          <p className="pageLead">DNAR status, anticipatory prescribing, and symptom management.</p>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <h3 className="sectionTitle">Care plan entry</h3>
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
                <FormField
                  name="dnarStatus"
                  control={control}
                  label="DNAR status"
                  type="select"
                  options={[
                    { value: "confirmed", label: "Confirmed" },
                    { value: "discussed", label: "Discussed" },
                    { value: "pending", label: "Pending" },
                  ]}
                />
                <FormField name="anticipatoryMeds" control={control} label="Anticipatory meds" placeholder="e.g. Morphine, Midazolam" />
                <FormField name="symptom" control={control} label="Symptom" placeholder="e.g. Pain, dyspnoea" />
                <FormField name="intervention" control={control} label="Intervention" placeholder="e.g. Oral morphine 2.5mg PRN" />
              </div>
              <div className="actions">
                <button type="submit" className="btn primary">Save entry</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 className="sectionTitle">Records</h3>
            <DataTable data={records} columns={columns} pageSize={5} />
          </div>
        </div>

        <div style={{ maxWidth: 380 }}>
          <div className="card">
            <h3 className="sectionTitle">DNAR summary</h3>
            <ul className="list" style={{ marginTop: 8 }}>
              {records.map((r) => (
                <li key={r.id} className="listItem">
                  <span>
                    <strong>{r.resident}</strong>
                    <br />
                    <small className="muted">{r.anticipatoryMeds || "No anticipatory meds recorded"}</small>
                  </span>
                  <span className={r.dnarStatus === "confirmed" ? "badge danger" : r.dnarStatus === "discussed" ? "badge warning" : "badge"}>{r.dnarStatus}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
