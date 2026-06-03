"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "./FormField";
import DataTable from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { createApiKey, listApiKeys, revokeApiKey, type ApiKey } from "../lib/api-client";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
});

type CreateForm = z.infer<typeof createSchema>;

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

const columns: ColumnDef<ApiKey>[] = [
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
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", scopes: [] },
  });

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listApiKeys();
      setKeys(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const onSubmit = async (data: CreateForm) => {
    try {
      setError(null);
      const result = await createApiKey(data);
      setNewKey(result.key);
      reset();
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    }
  };

  const revoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    }
  };

  return (
    <div className="stack">
      {error ? (
        <div className="notice">
          <strong>API notice</strong>
          <p>{error}</p>
        </div>
      ) : null}

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
                      const current = (control._formValues?.scopes ?? []) as string[];
                      const next = e.target.checked ? [...current, opt.value] : current.filter((v) => v !== opt.value);
                      setValue("scopes", next);
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
            <button className="btn" style={{ marginTop: 8 }} type="button" onClick={() => setNewKey(null)}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="sectionTitle">API keys {loading ? "(loading…)" : ""}</h3>
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
                    <button className="btn" type="button" onClick={() => void revoke(row.original.id)}>
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
