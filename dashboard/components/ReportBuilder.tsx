"use client";

import { useState } from "react";
import DataTable from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";

interface FieldDef {
  key: string;
  label: string;
  category: string;
}

interface FilterDef {
  id: string;
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string;
}

const AVAILABLE_FIELDS: FieldDef[] = [
  { key: "residentName", label: "Resident Name", category: "Resident" },
  { key: "room", label: "Room", category: "Resident" },
  { key: "age", label: "Age", category: "Resident" },
  { key: "need", label: "Need", category: "Resident" },
  { key: "staffName", label: "Staff Name", category: "Staff" },
  { key: "role", label: "Role", category: "Staff" },
  { key: "incidentType", label: "Incident Type", category: "Incident" },
  { key: "severity", label: "Severity", category: "Incident" },
  { key: "status", label: "Status", category: "Incident" },
  { key: "medication", label: "Medication", category: "MAR" },
  { key: "roundTime", label: "Round Time", category: "MAR" },
];

const OPERATOR_LABELS: Record<string, string> = {
  eq: "equals",
  ne: "not equals",
  gt: "greater than",
  gte: "greater than or equal",
  lt: "less than",
  lte: "less than or equal",
  contains: "contains",
  in: "is in",
};

export default function ReportBuilder() {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterDef[]>([]);
  const [chartType, setChartType] = useState<"table" | "bar" | "line" | "pie">("table");
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);

  const addField = (key: string) => {
    if (!selectedFields.includes(key)) setSelectedFields((prev) => [...prev, key]);
  };

  const removeField = (key: string) => {
    setSelectedFields((prev) => prev.filter((k) => k !== key));
  };

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: AVAILABLE_FIELDS[0].key, operator: "eq", value: "" },
    ]);
  };

  const updateFilter = (id: string, patch: Partial<FilterDef>) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const runPreview = () => {
    const demo: Record<string, unknown>[] = [
      { residentName: "Margaret Ellis", room: "12A", age: 87, need: "Dementia care", incidentType: "Fall", severity: "High", status: "Open" },
      { residentName: "George Patel", room: "7", age: 79, need: "Rehabilitation", incidentType: "-", severity: "-", status: "-" },
      { residentName: "Evelyn Morgan", room: "21", age: 92, need: "Nursing care", incidentType: "Pressure", severity: "Medium", status: "Review" },
    ];
    setPreviewData(demo);
  };

  const columns: ColumnDef<Record<string, unknown>>[] = useMemoColumns(selectedFields);

  return (
    <div className="stack">
      <div className="card">
        <h3 className="sectionTitle">Fields</h3>
        <div className="actions" style={{ flexWrap: "wrap", marginTop: 8 }}>
          {AVAILABLE_FIELDS.map((f) => (
            <button
              key={f.key}
              className={`btn ${selectedFields.includes(f.key) ? "primary" : ""}`}
              onClick={() => (selectedFields.includes(f.key) ? removeField(f.key) : addField(f.key))}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="pageHeader">
          <h3 className="sectionTitle">Filters</h3>
          <button className="btn primary" onClick={addFilter}>
            Add filter
          </button>
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          {filters.map((f) => (
            <div key={f.id} className="formGrid" style={{ alignItems: "end" }}>
              <div className="field">
                <label>Field</label>
                <select className="select" value={f.field} onChange={(e) => updateFilter(f.id, { field: e.target.value })}>
                  {AVAILABLE_FIELDS.map((af) => (
                    <option key={af.key} value={af.key}>
                      {af.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Operator</label>
                <select className="select" value={f.operator} onChange={(e) => updateFilter(f.id, { operator: e.target.value as FilterDef["operator"] })}>
                  {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Value</label>
                <input className="input" value={f.value} onChange={(e) => updateFilter(f.id, { value: e.target.value })} />
              </div>
              <button className="btn" style={{ height: 40 }} onClick={() => removeFilter(f.id)}>
                Remove
              </button>
            </div>
          ))}
          {filters.length === 0 && <p className="muted" style={{ fontSize: 12 }}>No filters applied.</p>}
        </div>
      </div>

      <div className="card">
        <h3 className="sectionTitle">Chart type</h3>
        <div className="actions" style={{ marginTop: 8 }}>
          {(["table", "bar", "line", "pie"] as const).map((t) => (
            <button key={t} className={`btn ${chartType === t ? "primary" : ""}`} onClick={() => setChartType(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="actions">
        <button className="btn primary" onClick={runPreview}>
          Run preview
        </button>
        <button className="btn" onClick={() => alert("Export CSV")}>
          Export CSV
        </button>
        <button className="btn" onClick={() => alert("Export Excel")}>
          Export Excel
        </button>
        <button className="btn" onClick={() => alert("Export PDF")}>
          Export PDF
        </button>
      </div>

      {previewData.length > 0 && (
        <div className="card">
          <h3 className="sectionTitle">Preview</h3>
          <DataTable data={previewData} columns={columns} pageSize={5} />
        </div>
      )}
    </div>
  );
}

function useMemoColumns(keys: string[]): ColumnDef<Record<string, unknown>>[] {
  const fieldMap = new Map(AVAILABLE_FIELDS.map((f) => [f.key, f.label]));
  return keys.map((key) => ({
    accessorKey: key,
    header: fieldMap.get(key) ?? key,
    cell: (info) => String(info.getValue() ?? "-"),
  }));
}
