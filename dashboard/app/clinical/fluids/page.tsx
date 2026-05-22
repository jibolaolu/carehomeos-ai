"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ChartCard from "../../../components/ChartCard";
import FluidBalanceChart from "../../../components/FluidBalanceChart";
import FormField from "../../../components/FormField";
import DataTable from "../../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

const fluidSchema = z.object({
  residentId: z.string().min(1, "Select a resident"),
  type: z.enum(["intake", "output"]),
  route: z.string().min(1, "Enter route"),
  volumeMl: z.coerce.number().min(1),
  note: z.string().optional(),
});

type FluidForm = z.infer<typeof fluidSchema>;

interface FluidRecord {
  id: string;
  resident: string;
  time: string;
  type: "intake" | "output";
  route: string;
  volumeMl: number;
  note?: string;
}

const columns: ColumnDef<FluidRecord>[] = [
  { accessorKey: "resident", header: "Resident" },
  { accessorKey: "time", header: "Time" },
  {
    accessorKey: "type",
    header: "Type",
    cell: (info) => (
      <span className={info.getValue() === "intake" ? "badge" : "badge warning"}>{info.getValue() as string}</span>
    ),
  },
  { accessorKey: "route", header: "Route" },
  { accessorKey: "volumeMl", header: "Volume (ml)" },
  { accessorKey: "note", header: "Note" },
];

const chartData = [
  { time: "06:00", intake: 200, output: 0, balance: 200 },
  { time: "08:00", intake: 350, output: 150, balance: 400 },
  { time: "10:00", intake: 250, output: 200, balance: 450 },
  { time: "12:00", intake: 400, output: 250, balance: 600 },
  { time: "14:00", intake: 300, output: 300, balance: 600 },
  { time: "16:00", intake: 250, output: 200, balance: 650 },
  { time: "18:00", intake: 350, output: 250, balance: 750 },
  { time: "20:00", intake: 200, output: 200, balance: 750 },
];

export default function FluidsPage() {
  const [records, setRecords] = useState<FluidRecord[]>([
    { id: "f1", resident: "Margaret Ellis", time: "08:00", type: "intake", route: "Oral", volumeMl: 250, note: "Water + tea" },
    { id: "f2", resident: "Margaret Ellis", time: "10:00", type: "output", route: "Catheter", volumeMl: 180 },
    { id: "f3", resident: "Evelyn Morgan", time: "08:00", type: "intake", route: "Oral", volumeMl: 200 },
  ]);

  const { control, handleSubmit, reset } = useForm<FluidForm>({
    resolver: zodResolver(fluidSchema),
    defaultValues: { residentId: "", type: "intake", route: "", volumeMl: 0, note: "" },
  });

  const onSubmit = (data: FluidForm) => {
    const residentName = data.residentId === "res-001" ? "Margaret Ellis" : data.residentId === "res-002" ? "George Patel" : "Evelyn Morgan";
    setRecords((prev) => [
      { id: crypto.randomUUID(), resident: residentName, time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), type: data.type, route: data.route, volumeMl: data.volumeMl, note: data.note },
      ...prev,
    ]);
    reset();
  };

  const totalIntake = records.filter((r) => r.type === "intake").reduce((sum, r) => sum + r.volumeMl, 0);
  const totalOutput = records.filter((r) => r.type === "output").reduce((sum, r) => sum + r.volumeMl, 0);
  const balance = totalIntake - totalOutput;

  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Fluid balance</h1>
          <p className="pageLead">Track intake, output, and running balance with deviation alerts.</p>
        </div>
      </div>

      <div className="metrics">
        <div className="metricTile">
          <div>
            <p className="metricLabel">Total intake</p>
            <p className="metricValue">{totalIntake} ml</p>
          </div>
        </div>
        <div className="metricTile">
          <div>
            <p className="metricLabel">Total output</p>
            <p className="metricValue">{totalOutput} ml</p>
          </div>
        </div>
        <div className="metricTile">
          <div>
            <p className="metricLabel">Balance</p>
            <p className="metricValue">{balance > 0 ? `+${balance}` : balance} ml</p>
          </div>
        </div>
        <div className="metricTile">
          <div>
            <p className="metricLabel">Deviation alert</p>
            <p className="metricValue" style={{ fontSize: 18 }}>
              {balance < -500 ? <span className="badge danger">Negative balance</span> : balance > 1000 ? <span className="badge warning">High positive</span> : <span className="badge success">Within range</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          <ChartCard title="Fluid balance chart" subtitle="Intake, output, and running balance">
            <FluidBalanceChart data={chartData} target={1500} />
          </ChartCard>

          <div className="card">
            <h3 className="sectionTitle">History</h3>
            <DataTable data={records} columns={columns} pageSize={8} />
          </div>
        </div>

        <div style={{ maxWidth: 380 }}>
          <div className="card">
            <h3 className="sectionTitle">New entry</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="stack" style={{ marginTop: 12 }}>
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
                  { value: "intake", label: "Intake" },
                  { value: "output", label: "Output" },
                ]}
              />
              <FormField name="route" control={control} label="Route" placeholder="e.g. Oral, IV, Catheter" />
              <FormField name="volumeMl" control={control} label="Volume (ml)" type="number" />
              <FormField name="note" control={control} label="Note" type="textarea" />
              <button type="submit" className="btn primary">Add entry</button>
            </form>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="sectionTitle">Daily summary</h3>
            <ul className="list">
              <li className="listItem">
                <span>Target intake</span>
                <strong>1,500 ml</strong>
              </li>
              <li className="listItem">
                <span>Current intake</span>
                <strong>{totalIntake} ml</strong>
              </li>
              <li className="listItem">
                <span>% of target</span>
                <strong>{Math.round((totalIntake / 1500) * 100)}%</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
