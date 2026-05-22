const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("carehomeos.token")
      : null;

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.message || response.statusText,
      response.status,
      body.code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// Residents
export function listResidents(params?: { q?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: Resident[]; total: number }>(`/residents?${qs.toString()}`);
}

export function getResident(id: string) {
  return fetchWithAuth<Resident>(`/residents/${id}`);
}

export function createResident(data: ResidentCreate) {
  return fetchWithAuth<Resident>("/residents", { method: "POST", body: JSON.stringify(data) });
}

export function updateResident(id: string, data: Partial<ResidentCreate>) {
  return fetchWithAuth<Resident>(`/residents/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// Staff
export function listStaff(params?: { q?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: Staff[]; total: number }>(`/staff?${qs.toString()}`);
}

export function getStaff(id: string) {
  return fetchWithAuth<Staff>(`/staff/${id}`);
}

// Incidents
export function listIncidents(params?: { status?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: Incident[]; total: number }>(`/incidents?${qs.toString()}`);
}

export function getIncident(id: string) {
  return fetchWithAuth<Incident>(`/incidents/${id}`);
}

export function createIncident(data: IncidentCreate) {
  return fetchWithAuth<Incident>("/incidents", { method: "POST", body: JSON.stringify(data) });
}

// MAR
export function listMAR(params?: { date?: string; residentId?: string }) {
  const qs = new URLSearchParams();
  if (params?.date) qs.set("date", params.date);
  if (params?.residentId) qs.set("residentId", params.residentId);
  return fetchWithAuth<{ items: MAREntry[] }>(`/mar?${qs.toString()}`);
}

// Clinical
export function listWoundAssessments(params?: { residentId?: string }) {
  const qs = new URLSearchParams();
  if (params?.residentId) qs.set("residentId", params.residentId);
  return fetchWithAuth<{ items: WoundAssessment[] }>(`/clinical/wounds?${qs.toString()}`);
}

export function createWoundAssessment(data: WoundAssessmentCreate) {
  return fetchWithAuth<WoundAssessment>("/clinical/wounds", { method: "POST", body: JSON.stringify(data) });
}

export function listVitalSigns(params?: { residentId?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.residentId) qs.set("residentId", params.residentId);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  return fetchWithAuth<{ items: VitalSigns[] }>(`/clinical/vitals?${qs.toString()}`);
}

export function createVitalSigns(data: VitalSignsCreate) {
  return fetchWithAuth<VitalSigns>("/clinical/vitals", { method: "POST", body: JSON.stringify(data) });
}

export function listFluidBalance(params?: { residentId?: string; date?: string }) {
  const qs = new URLSearchParams();
  if (params?.residentId) qs.set("residentId", params.residentId);
  if (params?.date) qs.set("date", params.date);
  return fetchWithAuth<{ items: FluidEntry[] }>(`/clinical/fluids?${qs.toString()}`);
}

export function createFluidEntry(data: FluidEntryCreate) {
  return fetchWithAuth<FluidEntry>("/clinical/fluids", { method: "POST", body: JSON.stringify(data) });
}

// Reports
export function runReport(config: ReportConfig) {
  return fetchWithAuth<{ rows: Record<string, unknown>[]; columns: string[] }>("/reports/run", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export function exportReport(config: ReportConfig, format: "csv" | "excel" | "pdf") {
  return fetchWithAuth<Blob>(`/reports/export?format=${format}`, {
    method: "POST",
    body: JSON.stringify(config),
  });
}

// Developer
export function listApiKeys() {
  return fetchWithAuth<{ items: ApiKey[] }>("/developer/api-keys");
}

export function createApiKey(data: ApiKeyCreate) {
  return fetchWithAuth<{ key: string; item: ApiKey }>("/developer/api-keys", { method: "POST", body: JSON.stringify(data) });
}

export function revokeApiKey(id: string) {
  return fetchWithAuth<void>(`/developer/api-keys/${id}/revoke`, { method: "POST" });
}

export function listWebhooks() {
  return fetchWithAuth<{ items: Webhook[] }>("/developer/webhooks");
}

export function createWebhook(data: WebhookCreate) {
  return fetchWithAuth<Webhook>("/developer/webhooks", { method: "POST", body: JSON.stringify(data) });
}

export function updateWebhook(id: string, data: Partial<WebhookCreate>) {
  return fetchWithAuth<Webhook>(`/developer/webhooks/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteWebhook(id: string) {
  return fetchWithAuth<void>(`/developer/webhooks/${id}`, { method: "DELETE" });
}

export function listWebhookDeliveries(webhookId: string) {
  return fetchWithAuth<{ items: WebhookDelivery[] }>(`/developer/webhooks/${webhookId}/deliveries`);
}

export function testWebhook(id: string) {
  return fetchWithAuth<{ success: boolean; statusCode?: number; body?: string }>(`/developer/webhooks/${id}/test`, { method: "POST" });
}

// Types
export interface Resident {
  id: string;
  name: string;
  room: string;
  age: number;
  need: string;
  fallsRisk: string;
  deterioration: string;
  hydration: string;
  nextReview: string;
}

export interface ResidentCreate {
  name: string;
  room: string;
  age: number;
  need: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  shift: string;
  training: number;
}

export interface Incident {
  id: string;
  resident: string;
  type: string;
  severity: string;
  status: string;
}

export interface IncidentCreate {
  residentId: string;
  type: string;
  severity: string;
  description: string;
}

export interface MAREntry {
  id: string;
  resident: string;
  room: string;
  medication: string;
  time: string;
  status: string;
}

export interface WoundAssessment {
  id: string;
  residentId: string;
  locationX: number;
  locationY: number;
  side: "front" | "back";
  type: string;
  size: string;
  stage: string;
  photos: string[];
  createdAt: string;
}

export interface WoundAssessmentCreate {
  residentId: string;
  locationX: number;
  locationY: number;
  side: "front" | "back";
  type: string;
  size: string;
  stage: string;
}

export interface VitalSigns {
  id: string;
  residentId: string;
  recordedAt: string;
  respirationRate: number;
  oxygenSaturation: number;
  temperature: number;
  systolicBP: number;
  diastolicBP: number;
  pulse: number;
  consciousness: "A" | "V" | "P" | "U";
  supplementalO2: boolean;
  news2Score: number;
}

export interface VitalSignsCreate {
  residentId: string;
  respirationRate: number;
  oxygenSaturation: number;
  temperature: number;
  systolicBP: number;
  diastolicBP: number;
  pulse: number;
  consciousness: "A" | "V" | "P" | "U";
  supplementalO2: boolean;
}

export interface FluidEntry {
  id: string;
  residentId: string;
  timestamp: string;
  type: "intake" | "output";
  route: string;
  volumeMl: number;
  note?: string;
}

export interface FluidEntryCreate {
  residentId: string;
  type: "intake" | "output";
  route: string;
  volumeMl: number;
  note?: string;
}

export interface ReportConfig {
  fields: string[];
  filters: ReportFilter[];
  chartType?: "bar" | "line" | "pie" | "table";
}

export interface ReportFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: unknown;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

export interface ApiKeyCreate {
  name: string;
  scopes: string[];
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookCreate {
  url: string;
  events: string[];
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed" | "pending";
  httpStatus?: number;
  deliveredAt?: string;
  errorMessage?: string;
}
