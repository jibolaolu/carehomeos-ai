import { fetchApi, getApiBase, getCareHomeId } from "./api-base";

const API_BASE = getApiBase();

export { getApiBase, getCareHomeId, fetchApi };

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
export function listIncidents(params?: { status?: string; isSafeguarding?: boolean; severity?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.isSafeguarding !== undefined) qs.set("is_safeguarding", String(params.isSafeguarding));
  if (params?.severity) qs.set("severity", params.severity);
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

export function updateIncident(id: string, data: Partial<IncidentCreate>) {
  return fetchWithAuth<Incident>(`/incidents/${id}`, { method: "PATCH", body: JSON.stringify(data) });
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
  if (params?.residentId) qs.set("resident_id", params.residentId);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  return fetchWithAuth<VitalSigns[]>(`/clinical/vitals?${qs.toString()}`);
}

export function createVitalSigns(data: VitalSignsCreate) {
  return fetchWithAuth<VitalSigns>("/clinical/vitals", { method: "POST", body: JSON.stringify(data) });
}

export function listClinicalVitals(residentId?: string) {
  const qs = residentId ? `?resident_id=${encodeURIComponent(residentId)}` : "";
  return fetchWithAuth<ClinicalVitalRecord[]>(`/clinical/vitals${qs}`);
}

export function createClinicalVitals(data: ClinicalVitalsCreate) {
  return fetchWithAuth<{ id: string; news2_score: number; news2_risk_category: string }>("/clinical/vitals", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

// Safeguarding
export function listSafeguardingAlerts(params?: { status?: string; severity?: string; residentId?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.residentId) qs.set("resident_id", params.residentId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: SafeguardingAlert[]; total: number }>(`/safeguarding/alerts?${qs.toString()}`);
}

export function acknowledgeAlert(alertId: string) {
  return fetchWithAuth<SafeguardingAlert>(`/safeguarding/alerts/${alertId}/acknowledge`, { method: "POST" });
}

export function listSafeguardingCases(params?: { status?: string; residentId?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.residentId) qs.set("resident_id", params.residentId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: SafeguardingCase[]; total: number }>(`/safeguarding/cases?${qs.toString()}`);
}

export function getSafeguardingCase(id: string) {
  return fetchWithAuth<SafeguardingCase>(`/safeguarding/cases/${id}`);
}

export function createSafeguardingCase(data: { residentId?: string; riskLevel?: string }) {
  return fetchWithAuth<SafeguardingCase>("/safeguarding/cases", { method: "POST", body: JSON.stringify(data) });
}

export function updateSafeguardingCase(id: string, data: Partial<{ status: string; riskLevel: string; assignedToUserId: string; closureSummary: string; referralMade: boolean; referralAuthority: string; referralReference: string }>) {
  return fetchWithAuth<SafeguardingCase>(`/safeguarding/cases/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function generateSection42(data: { safeguardingCaseId: string }) {
  return fetchWithAuth<Section42Enquiry>("/safeguarding/section42/generate", { method: "POST", body: JSON.stringify(data) });
}

export function listSection42Enquiries(params?: { caseId?: string; status?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.caseId) qs.set("case_id", params.caseId);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: Section42Enquiry[]; total: number }>(`/safeguarding/section42?${qs.toString()}`);
}

export function detectPatterns(data: { residentId: string; timeWindowDays?: number; patternType?: string }) {
  return fetchWithAuth<RiskPattern>("/safeguarding/patterns/detect", { method: "POST", body: JSON.stringify(data) });
}

export function listPatternSignals(params?: { residentId?: string; signalType?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.residentId) qs.set("resident_id", params.residentId);
  if (params?.signalType) qs.set("signal_type", params.signalType);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: PatternSignal[]; total: number }>(`/safeguarding/patterns/signals?${qs.toString()}`);
}

export function listRiskPatterns(params?: { residentId?: string; patternType?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.residentId) qs.set("resident_id", params.residentId);
  if (params?.patternType) qs.set("pattern_type", params.patternType);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: RiskPattern[]; total: number }>(`/safeguarding/patterns?${qs.toString()}`);
}

export function createEvidencePack(data: EvidencePackCreate) {
  return fetchWithAuth<EvidencePack>("/safeguarding/evidence-packs", { method: "POST", body: JSON.stringify(data) });
}

export function generateEvidencePack(packId: string) {
  return fetchWithAuth<EvidencePack>(`/safeguarding/evidence-packs/${packId}/generate`, { method: "POST" });
}

export function getEvidencePack(packId: string) {
  return fetchWithAuth<EvidencePack>(`/safeguarding/evidence-packs/${packId}`);
}

export function listEvidencePacks(params?: { caseId?: string; status?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.caseId) qs.set("case_id", params.caseId);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return fetchWithAuth<{ items: EvidencePack[]; total: number }>(`/safeguarding/evidence-packs?${qs.toString()}`);
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
export function listWebhooks(careHomeId?: string) {
  const id = careHomeId ?? getCareHomeId();
  return fetchWithAuth<WebhookSubscription[]>(`/webhooks/subscriptions?care_home_id=${encodeURIComponent(id)}`);
}

export function createWebhook(data: WebhookCreate & { name: string; careHomeId?: string }) {
  const id = data.careHomeId ?? getCareHomeId();
  return fetchWithAuth<WebhookSubscription>(`/webhooks/subscriptions?care_home_id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      url: data.url,
      secret: data.secret,
      events: data.events,
    }),
  });
}

export function deleteWebhook(id: string) {
  return fetchWithAuth<void>(`/webhooks/subscriptions/${id}`, { method: "DELETE" });
}

export function listWebhookDeliveries(subscriptionId?: string) {
  const qs = subscriptionId ? `?subscription_id=${encodeURIComponent(subscriptionId)}` : "";
  return fetchWithAuth<{ data: WebhookDelivery[]; meta: { total: number } }>(`/webhooks/deliveries${qs}`);
}

export function testWebhook(id: string) {
  return fetchWithAuth<{ delivery_id: string; status: string; http_status_code?: number; error_message?: string }>(
    `/webhooks/test?subscription_id=${encodeURIComponent(id)}`,
    { method: "POST" },
  );
}

export function listApiKeys(careHomeId?: string) {
  const id = careHomeId ?? getCareHomeId();
  return fetchWithAuth<{ items: ApiKey[] }>(`/developer/api-keys?care_home_id=${encodeURIComponent(id)}`);
}

export function createApiKey(data: ApiKeyCreate & { careHomeId?: string }) {
  const id = data.careHomeId ?? getCareHomeId();
  return fetchWithAuth<{ key: string; item: ApiKey }>("/developer/api-keys", {
    method: "POST",
    body: JSON.stringify({ ...data, care_home_id: id, user_id: "dashboard" }),
  });
}

export function revokeApiKey(id: string) {
  return fetchWithAuth<{ status: string }>(`/developer/api-keys/${id}/revoke`, { method: "POST" });
}

export function getOnboardingProgress(careHomeId?: string) {
  const id = careHomeId ?? getCareHomeId();
  return fetchWithAuth<OnboardingProgress>(`/onboarding/progress?care_home_id=${encodeURIComponent(id)}`);
}

export function updateOnboardingProgress(updates: Partial<OnboardingChecklist>, careHomeId?: string) {
  const id = careHomeId ?? getCareHomeId();
  return fetchWithAuth<OnboardingProgress>(`/onboarding/progress?care_home_id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(updates),
  });
}

export function getGroupDashboard(groupParentId?: string) {
  const qs = groupParentId ? `?group_parent_id=${encodeURIComponent(groupParentId)}` : "";
  return fetchWithAuth<GroupDashboardData>(`/reports/group-dashboard${qs}`);
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
  careHomeId: string;
  residentId: string | null;
  reportedById: string;
  incidentType: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  immediateActionTaken: string;
  location: string | null;
  incidentDate: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  isSafeguarding: boolean;
  safeguardingCategory: string | null;
  dutyOfCandourTriggered: boolean;
  familyNotified: boolean;
  gpNotified: boolean;
  cqcRelevant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentCreate {
  residentId?: string;
  incidentType?: string;
  category?: string;
  severity?: string;
  title: string;
  description: string;
  immediateActionTaken: string;
  location?: string;
  incidentDate?: string;
  isSafeguarding?: boolean;
  safeguardingCategory?: string;
  dutyOfCandourTriggered?: boolean;
  familyNotified?: boolean;
  gpNotified?: boolean;
  cqcRelevant?: boolean;
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

export interface SafeguardingAlert {
  id: string;
  careHomeId: string;
  residentId: string | null;
  incidentId: string | null;
  careNoteId: string | null;
  sourceType: string;
  sourceId: string | null;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  evidenceSummary: string | null;
  triggeredByUserId: string | null;
  acknowledgedByUserId: string | null;
  acknowledgedAt: string | null;
  safeguardingCaseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SafeguardingCase {
  id: string;
  careHomeId: string;
  residentId: string | null;
  reference: string;
  status: string;
  riskLevel: string | null;
  openedAt: string;
  openedByUserId: string;
  assignedToUserId: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  closureSummary: string | null;
  referralMade: boolean;
  referralAuthority: string | null;
  referralReference: string | null;
  referralMadeAt: string | null;
  reviewDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Section42Enquiry {
  id: string;
  careHomeId: string;
  safeguardingCaseId: string;
  residentId: string | null;
  reference: string;
  status: string;
  generatedByUserId: string;
  generatedAt: string;
  submittedAt: string | null;
  concludedAt: string | null;
  conclusionOutcome: string | null;
  summary: string | null;
  risks: string | null;
  evidence: string | null;
  capacityConsiderations: string | null;
  recommendedOutcomes: string | null;
  narrative: string | null;
  modelProvider: string | null;
  modelName: string | null;
  fallbackUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatternSignal {
  id: string;
  careHomeId: string;
  residentId: string;
  sourceType: string;
  sourceId: string;
  signalType: string;
  detectedAt: string;
  evidenceText: string | null;
  confidence: number;
  riskWeight: number;
  contributingData: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiskPattern {
  id: string;
  careHomeId: string;
  residentId: string;
  safeguardingCaseId: string | null;
  patternType: string;
  category: string;
  severity: string;
  confidence: number;
  timeWindowDays: number;
  windowStart: string;
  windowEnd: string;
  summary: string;
  contributingEvidence: string | null;
  recommendedActions: string | null;
  modelProvider: string | null;
  modelName: string | null;
  fallbackUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvidencePackCreate {
  safeguardingCaseId: string;
  packType?: string;
  dateFrom: string;
  dateTo: string;
  includeIncidents?: boolean;
  includeCareNotes?: boolean;
  includeSection42?: boolean;
  includeAlerts?: boolean;
  includePatterns?: boolean;
}

export interface EvidencePack {
  id: string;
  careHomeId: string;
  safeguardingCaseId: string;
  residentId: string | null;
  reference: string;
  status: string;
  packType: string;
  dateFrom: string;
  dateTo: string;
  includeIncidents: boolean;
  includeCareNotes: boolean;
  includeSection42: boolean;
  includeAlerts: boolean;
  includePatterns: boolean;
  generatedByUserId: string;
  generatedAt: string | null;
  s3Bucket: string | null;
  s3KeyPdf: string | null;
  s3KeyZip: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
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
  careHomeId?: string;
}

export interface WebhookSubscription {
  id: string;
  care_home_id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_delivered_at?: string | null;
  delivery_count: number;
  failure_count: number;
}

export interface WebhookCreate {
  name: string;
  url: string;
  events: string[];
  secret: string;
  careHomeId?: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  event_type: string;
  status: string;
  http_status_code?: number;
  delivered_at?: string;
  error_message?: string;
}

export interface OnboardingChecklist {
  home_details_configured?: boolean;
  residents_imported?: boolean;
  staff_setup_complete?: boolean;
  care_plan_templates_loaded?: boolean;
  mar_configured?: boolean;
  first_care_note_recorded?: boolean;
  go_live_checklist_complete?: boolean;
}

export interface OnboardingProgress {
  care_home_id: string;
  phase: string;
  checklist?: OnboardingChecklist;
  milestones?: Record<string, boolean>;
  day_30_completed?: boolean;
}

export interface GroupDashboardData {
  generated_at: string;
  homes_count: number;
  total_beds: number;
  occupied_beds: number;
  occupancy_rate: number;
  total_residents: number;
  incidents_30d: number;
  avg_news2?: number | null;
  avg_news2_score?: number | null;
  homes?: Array<{ id: string; name: string; occupancy_rate: number; total_beds?: number; occupied_beds?: number }>;
}

export interface ClinicalVitalRecord {
  id: string;
  resident_id: string;
  recorded_at: string | null;
  news2_score: number;
  news2_risk_category?: string;
}

export interface ClinicalVitalsCreate {
  resident_id: string;
  respiration_rate: number;
  spo2_percent: number;
  temperature_celsius: number;
  systolic_bp: number;
  diastolic_bp: number;
  pulse_rate: number;
  consciousness_level: string;
  supplemental_oxygen: boolean;
  recorded_by_id?: string;
}
