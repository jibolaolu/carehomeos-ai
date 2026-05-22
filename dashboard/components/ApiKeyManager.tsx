"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "./FormField";
import DataTable from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
});

type CreateForm = z.infer<typeof createSchema>;

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

const SCOPE_OPTIONS = [
  { value: "residents:read", label: "Residents read" },
  { value: "residents:write", label: "Residents write" },
  { value: "staff:read", label: "Staff read" },
  { value: "staff:write", label: "Staff write" },
  { value: "incidents:read", label: "Incidents read" },
  { value: "incidents:write", label: "Incidents write" },
  { value: "reports:read", label: "Reports read" },
  { value: "webhooks:manage", label: "Webhooks manage" },
];

const columns: ColumnDef<ApiKeyItem>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "prefix", header: "Prefix" },
  {
    accessorKey: "scopes",
    header: "Scopes",
    cell: (info) => (info.getValue() as string[]).join(", "),
  },
  { accessorKey: "createdAt", header: "Created" },
  {
    accessorKey: "lastUsedAt",
    header: "Last used",
    cell: (info) => (info.getValue() as string) ?? "Never",
  },
  {
    accessorKey: "revoked",
    header: "Status",
    cell: (info) => (
      <span className={info.getValue() ? "badge danger" : "badge success"}>
        {info.getValue() ? "Revoked" : "Active"}
      </span>
    ),
  },
];

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([
    { id: "key-1", name: "Production sync", prefix: "ch_live_***", scopes: ["residents:read", "staff:read"], createdAt: "2026-04-01", lastUsedAt: "2026-05-20", revoked: false },
    { id: "key-2", name: "Reporting export", prefix: "ch_live_***", scopes: ["reports:read"], createdAt: "2026-03-15", revoked: true },
  ]);
  const [newKey, setNewKey] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", scopes: [] },
  });

  const onSubmit = (data: CreateForm) => {
    const item: ApiKeyItem = {
      id: crypto.randomUUID(),
      name: data.name,
      prefix: "ch_live_***",
      scopes: data.scopes,
      createdAt: new Date().toISOString().slice(0, 10),
      revoked: false,
    };
    setKeys((prev) => [item, ...prev]);
    setNewKey(`ch_live_${Math.random().toString(36).slice(2, 14)}`);
    reset();
  };

  const revoke = (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
  };

  return (
    <div className="stack">
      <div className="card">
        <h3 className="sectionTitle">Create API key</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="formGrid" style={{ marginTop: 12 }}>
          <FormField name="name" control={control} label="Key name" placeholder="e.g. Production sync" />
          <div className="field">
            <label>Scopes</label>
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              {SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
                  <input
                    type="checkbox"
                    value={opt.value}
                    onChange={(e) => {
                      const current = control._formValues.scopes as string[];
                      const next = e.target.checked ? [...current, opt.value] : current.filter((v) => v !== opt.value);
                      control.setValue("scopes", next);
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button type="submit" className="btn primary">Create key</button>
          </div>
        </form>

        {newKey && (
          <div className="notice" style={{ marginTop: 16 }}>
            <strong>Copy your new API key now</strong>
            <code style={{ display: "block", marginTop: 8, padding: 10, background: "#fff", borderRadius: 6, fontSize: 13 }}>
              {newKey}
            </code>
            <button className="btn" style={{ marginTop: 8 }} onClick={() => setNewKey(null)}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="sectionTitle">API keys</h3>
        <DataTable
          data={keys}
          columns={[
            ...columns,
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => (
                <div className="actions">
                  {!row.original.revoked && (
                    <button className="btn" onClick={() => revoke(row.original.id)}>
                      Revoke
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          pageSize={5}
        />
      </div>
    </div>
  );
}
