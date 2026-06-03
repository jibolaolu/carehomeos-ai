"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "../../../components/FormField";
import DataTable from "../../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

const recordSchema = z.object({
  residentId: z.string().min(1, "Select a resident"),
  type: z.enum(["catheter", "stoma"]),
  action: z.enum(["change", "observation"]),
  siteCondition: z.string().min(1, "Enter site condition"),
  urineColour: z.string().optional(),
  urineAmount: z.string().optional(),
  stomaOutput: z.string().optional(),
  note: z.string().optional(),
});

type RecordForm = z.infer<typeof recordSchema>;

interface CatheterStomaRecord {
  id: string;
  resident: string;
  type: "catheter" | "stoma";
  action: "change" | "observation";
  siteCondition: string;
  note?: string;
  date: string;
  nextChange?: string;
}

const columns: ColumnDef<CatheterStomaRecord>[] = [
  { accessorKey: "resident", header: "Resident" },
  {
    accessorKey: "type",
    header: "Type",
    cell: (info) => <span className={info.getValue() === "catheter" ? "badge" : "badge warning"}>{info.getValue() as string}</span>,
  },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "siteCondition", header: "Site condition" },
  { accessorKey: "date", header: "Date" },
  { accessorKey: "nextChange", header: "Next due" },
];

export default function CatheterStomaClient() {
  const [records, setRecords] = useState<CatheterStomaRecord[]>([
    { id: "cs1", resident: "Evelyn Morgan", type: "catheter", action: "change", siteCondition: "Clean, no erythema", date: "2026-05-20", nextChange: "2026-05-27" },
    { id: "cs2", resident: "George Patel", type: "stoma", action: "observation", siteCondition: "Healthy stoma", date: "2026-05-21", nextChange: "2026-05-22" },
  ]);

  const { control, handleSubmit, reset, watch } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: { residentId: "", type: "catheter", action: "observation", siteCondition: "", note: "" },
  });

  const type = watch("type");

  const onSubmit = (data: RecordForm) => {
    const residentName = data.residentId === "res-001" ? "Margaret Ellis" : data.residentId === "res-002" ? "George Patel" : "Evelyn Morgan";
    const next = new Date();
    next.setDate(next.getDate() + (data.type === "catheter" ? 7 : 1));
    setRecords((prev) => [
      {
        id: crypto.randomUUID(),
        resident: residentName,
        type: data.type,
        action: data.action,
        siteCondition: data.siteCondition,
        note: data.note,
        date: new Date().toISOString().slice(0, 10),
        nextChange: next.toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    reset();
  };

  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Catheter &amp; stoma</h1>
          <p className="pageLead">Record changes, observations, and manage change schedules.</p>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <h3 className="sectionTitle">New record</h3>
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
                  name="type"
                  control={control}
                  label="Type"
                  type="select"
                  options={[
                    { value: "catheter", label: "Catheter" },
                    { value: "stoma", label: "Stoma" },
                  ]}
                />
                <FormField
                  name="action"
                  control={control}
                  label="Action"
                  type="select"
                  options={[
                    { value: "change", label: "Change" },
                    { value: "observation", label: "Observation" },
                  ]}
                />
                <FormField name="siteCondition" control={control} label="Site condition" placeholder="e.g. Clean, no erythema" />
                {type === "catheter" && (
                  <>
                    <FormField name="urineColour" control={control} label="Urine colour" placeholder="e.g. Straw" />
                    <FormField name="urineAmount" control={control} label="Urine amount" placeholder="e.g. 400ml" />
                  </>
                )}
                {type === "stoma" && (
                  <FormField name="stomaOutput" control={control} label="Stoma output" placeholder="e.g. 300ml, formed" />
                )}
              </div>
              <FormField name="note" control={control} label="Note" type="textarea" />
              <div className="actions">
                <button type="submit" className="btn primary">Save record</button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 className="sectionTitle">Records</h3>
            <DataTable data={records} columns={columns} pageSize={8} />
          </div>
        </div>

        <div style={{ maxWidth: 380 }}>
          <div className="card">
            <h3 className="sectionTitle">Change schedule</h3>
            <ul className="list" style={{ marginTop: 8 }}>
              {records
                .filter((r) => r.nextChange)
                .map((r) => (
                  <li key={r.id} className="listItem">
                    <span>
                      <strong>{r.resident}</strong>
                      <br />
                      <small className="muted">{r.type === "catheter" ? "Catheter change" : "Stoma review"}</small>
                    </span>
                    <span className="badge">{r.nextChange}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
