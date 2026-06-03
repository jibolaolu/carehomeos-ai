"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "./FormField";
import DataTable from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  testWebhook,
  type WebhookDelivery,
  type WebhookSubscription,
} from "../lib/api-client";

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Enter a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
  secret: z.string().min(16, "Secret must be at least 16 characters"),
});

type WebhookForm = z.infer<typeof webhookSchema>;

const EVENT_OPTIONS = [
  { value: "resident.created", label: "Resident created" },
  { value: "resident.updated", label: "Resident updated" },
  { value: "incident.created", label: "Incident created" },
  { value: "incident.updated", label: "Incident updated" },
  { value: "mar.administered", label: "MAR administered" },
  { value: "vitals.recorded", label: "Vitals recorded" },
];

const webhookColumns: ColumnDef<WebhookSubscription>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "url", header: "URL" },
  { accessorKey: "events", header: "Events", cell: (info) => (info.getValue() as string[]).join(", ") },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: (info) => (
      <span className={info.getValue() ? "badge success" : "badge danger"}>
        {info.getValue() ? "Active" : "Inactive"}
      </span>
    ),
  },
  { accessorKey: "created_at", header: "Created" },
];

const deliveryColumns: ColumnDef<WebhookDelivery>[] = [
  { accessorKey: "event_type", header: "Event" },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => {
      const v = info.getValue() as string;
      return (
        <span className={v === "delivered" ? "badge success" : v === "failed" ? "badge danger" : "badge warning"}>
          {v}
        </span>
      );
    },
  },
  { accessorKey: "http_status_code", header: "HTTP" },
  { accessorKey: "delivered_at", header: "Delivered" },
];

export default function WebhookConfig() {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm<WebhookForm>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { name: "", url: "", events: [], secret: "" },
  });

  const loadWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listWebhooks();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeliveries = useCallback(async (subscriptionId?: string | null) => {
    try {
      const result = await listWebhookDeliveries(subscriptionId ?? undefined);
      setDeliveries(result.data ?? []);
    } catch {
      setDeliveries([]);
    }
  }, []);

  useEffect(() => {
    void loadWebhooks();
    void loadDeliveries();
  }, [loadWebhooks, loadDeliveries]);

  const onSubmit = async (data: WebhookForm) => {
    try {
      setError(null);
      await createWebhook(data);
      reset();
      await loadWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook(id);
      if (selectedWebhook === id) setSelectedWebhook(null);
      await loadWebhooks();
      await loadDeliveries(selectedWebhook === id ? null : selectedWebhook);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete webhook");
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTesting(id);
      await testWebhook(id);
      await loadDeliveries(selectedWebhook ?? id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test delivery failed");
    } finally {
      setTesting(null);
    }
  };

  const filteredDeliveries = selectedWebhook
    ? deliveries.filter((d) => d.subscription_id === selectedWebhook)
    : deliveries;

  return (
    <div className="stack">
      {error ? (
        <div className="notice">
          <strong>API notice</strong>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="card">
        <h3 className="sectionTitle">Add webhook</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="formGrid" style={{ marginTop: 12 }}>
          <FormField name="name" control={control} label="Name" placeholder="Production sync" />
          <FormField name="url" control={control} label="URL" placeholder="https://..." />
          <FormField name="secret" control={control} label="Secret" type="password" placeholder="min 16 chars" />
          <div className="field">
            <label>Events</label>
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              {EVENT_OPTIONS.map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
                  <input
                    type="checkbox"
                    value={opt.value}
                    onChange={(e) => {
                      const current = (control._formValues?.events ?? []) as string[];
                      const next = e.target.checked ? [...current, opt.value] : current.filter((v) => v !== opt.value);
                      setValue("events", next);
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button type="submit" className="btn primary">Add webhook</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="sectionTitle">Subscriptions {loading ? "(loading…)" : ""}</h3>
        <DataTable
          data={webhooks}
          columns={[
            ...webhookColumns,
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => (
                <div className="actions">
                  <button className="btn" type="button" onClick={() => handleTest(row.original.id)} disabled={testing === row.original.id}>
                    {testing === row.original.id ? "Testing…" : "Test"}
                  </button>
                  <button className="btn" type="button" onClick={() => setSelectedWebhook(row.original.id)}>
                    History
                  </button>
                  <button className="btn" type="button" onClick={() => void handleDelete(row.original.id)}>
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          pageSize={5}
        />
      </div>

      <div className="card">
        <div className="pageHeader">
          <h3 className="sectionTitle">Delivery history</h3>
          {selectedWebhook && (
            <button className="btn" type="button" onClick={() => setSelectedWebhook(null)}>
              Show all
            </button>
          )}
        </div>
        <DataTable data={filteredDeliveries} columns={deliveryColumns} pageSize={5} />
      </div>
    </div>
  );
}
