"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "./FormField";
import DataTable from "./DataTable";
import type { ColumnDef } from "@tanstack/react-table";

const webhookSchema = z.object({
  url: z.string().url("Enter a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
  secret: z.string().min(16, "Secret must be at least 16 characters"),
});

type WebhookForm = z.infer<typeof webhookSchema>;

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface DeliveryItem {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed" | "pending";
  httpStatus?: number;
  deliveredAt?: string;
  errorMessage?: string;
}

const EVENT_OPTIONS = [
  { value: "resident.created", label: "Resident created" },
  { value: "resident.updated", label: "Resident updated" },
  { value: "incident.created", label: "Incident created" },
  { value: "incident.updated", label: "Incident updated" },
  { value: "mar.administered", label: "MAR administered" },
  { value: "vitals.recorded", label: "Vitals recorded" },
];

const webhookColumns: ColumnDef<WebhookItem>[] = [
  { accessorKey: "url", header: "URL" },
  { accessorKey: "events", header: "Events", cell: (info) => (info.getValue() as string[]).join(", ") },
  {
    accessorKey: "active",
    header: "Status",
    cell: (info) => (
      <span className={info.getValue() ? "badge success" : "badge danger"}>
        {info.getValue() ? "Active" : "Inactive"}
      </span>
    ),
  },
  { accessorKey: "createdAt", header: "Created" },
];

const deliveryColumns: ColumnDef<DeliveryItem>[] = [
  { accessorKey: "event", header: "Event" },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => {
      const v = info.getValue() as string;
      return (
        <span className={v === "success" ? "badge success" : v === "failed" ? "badge danger" : "badge warning"}>
          {v}
        </span>
      );
    },
  },
  { accessorKey: "httpStatus", header: "HTTP" },
  { accessorKey: "deliveredAt", header: "Delivered" },
];

export default function WebhookConfig() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    { id: "wh-1", url: "https://example.com/webhooks/carehomeos", events: ["resident.created", "incident.created"], active: true, createdAt: "2026-04-10" },
  ]);
  const [deliveries] = useState<DeliveryItem[]>([
    { id: "d-1", webhookId: "wh-1", event: "resident.created", status: "success", httpStatus: 200, deliveredAt: "2026-05-21T09:12:00Z" },
    { id: "d-2", webhookId: "wh-1", event: "incident.created", status: "failed", httpStatus: 500, deliveredAt: "2026-05-21T08:45:00Z", errorMessage: "Timeout" },
  ]);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<WebhookForm>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", events: [], secret: "" },
  });

  const onSubmit = (data: WebhookForm) => {
    setWebhooks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), url: data.url, events: data.events, active: true, createdAt: new Date().toISOString().slice(0, 10) },
    ]);
    reset();
  };

  const toggleActive = (id: string) => {
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)));
  };

  const filteredDeliveries = selectedWebhook ? deliveries.filter((d) => d.webhookId === selectedWebhook) : deliveries;

  return (
    <div className="stack">
      <div className="card">
        <h3 className="sectionTitle">Add webhook</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="formGrid" style={{ marginTop: 12 }}>
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
                      const current = control._formValues.events as string[];
                      const next = e.target.checked ? [...current, opt.value] : current.filter((v) => v !== opt.value);
                      control.setValue("events", next);
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
        <h3 className="sectionTitle">Subscriptions</h3>
        <DataTable
          data={webhooks}
          columns={[
            ...webhookColumns,
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => (
                <div className="actions">
                  <button className="btn" onClick={() => toggleActive(row.original.id)}>
                    {row.original.active ? "Pause" : "Resume"}
                  </button>
                  <button className="btn" onClick={() => setSelectedWebhook(row.original.id)}>
                    History
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
            <button className="btn" onClick={() => setSelectedWebhook(null)}>
              Show all
            </button>
          )}
        </div>
        <DataTable data={filteredDeliveries} columns={deliveryColumns} pageSize={5} />
      </div>
    </div>
  );
}
