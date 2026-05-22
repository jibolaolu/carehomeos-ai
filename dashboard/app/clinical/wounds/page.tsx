"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ChartCard from "../../../components/ChartCard";
import FormField from "../../../components/FormField";
import WoundBodyMap from "../../../components/WoundBodyMap";
import DataTable from "../../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const woundSchema = z.object({
  residentId: z.string().min(1, "Select a resident"),
  type: z.string().min(1, "Enter wound type"),
  size: z.string().min(1, "Enter size"),
  stage: z.string().min(1, "Enter stage"),
});

type WoundForm = z.infer<typeof woundSchema>;

interface WoundRecord {
  id: string;
  resident: string;
  location: string;
  type: string;
  size: string;
  stage: string;
  date: string;
}

const columns: ColumnDef<WoundRecord>[] = [
  { accessorKey: "resident", header: "Resident" },
  { accessorKey: "location", header: "Location" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "size", header: "Size" },
  { accessorKey: "stage", header: "Stage" },
  { accessorKey: "date", header: "Date" },
];

const healingData = [
  { date: "Apr 01", area: 12.4 },
  { date: "Apr 08", area: 10.1 },
  { date: "Apr 15", area: 8.3 },
  { date: "Apr 22", area: 6.5 },
  { date: "Apr 29", area: 4.8 },
];

export default function WoundsPage() {
  const [records, setRecords] = useState<WoundRecord[]>([
    { id: "w-1", resident: "Evelyn Morgan", location: "Left heel", type: "Pressure ulcer", size: "3x2cm", stage: "Stage 2", date: "2026-04-15" },
    { id: "w-2", resident: "Margaret Ellis", location: "Sacrum", type: "Pressure ulcer", size: "2x2cm", stage: "Stage 1", date: "2026-04-20" },
  ]);
  const [marker, setMarker] = useState<{ x: number; y: number; side: "front" | "back" } | null>(null);

  const { control, handleSubmit, reset } = useForm<WoundForm>({
    resolver: zodResolver(woundSchema),
    defaultValues: { residentId: "", type: "", size: "", stage: "" },
  });

  const onSubmit = (data: WoundForm) => {
    const residentName = data.residentId === "res-001" ? "Margaret Ellis" : data.residentId === "res-002" ? "George Patel" : "Evelyn Morgan";
    setRecords((prev) => [
      { id: crypto.randomUUID(), resident: residentName, location: marker ? `${marker.side} (${marker.x},${marker.y})` : "Not mapped", type: data.type, size: data.size, stage: data.stage, date: new Date().toISOString().slice(0, 10) },
      ...prev,
    ]);
    setMarker(null);
    reset();
  };

  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Wound assessments</h1>
          <p className="pageLead">Track wound location, progression, and healing trajectory.</p>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <h3 className="sectionTitle">New assessment</h3>
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
                <FormField name="type" control={control} label="Wound type" placeholder="e.g. Pressure ulcer" />
                <FormField name="size" control={control} label="Size" placeholder="e.g. 3x2cm" />
                <FormField
                  name="stage"
                  control={control}
                  label="Stage"
                  type="select"
                  options={[
                    { value: "Stage 1", label: "Stage 1" },
                    { value: "Stage 2", label: "Stage 2" },
                    { value: "Stage 3", label: "Stage 3" },
                    { value: "Stage 4", label: "Stage 4" },
                    { value: "Unstageable", label: "Unstageable" },
                  ]}
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn primary">Save assessment</button>
                {marker && (
                  <span className="badge">
                    Mapped: {marker.side} ({marker.x}, {marker.y})
                  </span>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h3 className="sectionTitle">Assessments</h3>
            <DataTable data={records} columns={columns} pageSize={5} />
          </div>

          <ChartCard title="Healing trajectory" subtitle="Wound area over time (cm²)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={healingData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--card-border)" }} />
                <Line type="monotone" dataKey="area" stroke="var(--success)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="stack" style={{ maxWidth: 320 }}>
          <WoundBodyMap
            markers={[
              { id: "m1", x: 38, y: 420, side: "back", label: "Heel" },
              { id: "m2", x: 50, y: 280, side: "back", label: "Sacrum" },
            ]}
            onSelect={(coords) => setMarker(coords)}
          />
          <div className="card">
            <h3 className="sectionTitle">Photo gallery</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ height: 120, background: "#f1f5f9", borderRadius: 8, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 12 }}>
                Photo placeholder
              </div>
              <div style={{ height: 120, background: "#f1f5f9", borderRadius: 8, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 12 }}>
                Photo placeholder
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
