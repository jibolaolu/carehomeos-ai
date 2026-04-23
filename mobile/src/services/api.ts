const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`CareHomeOS API ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  residents: () => request("/residents"),
  todayMar: () => request("/mar/rounds/today"),
  alerts: () => request("/incidents"),
  transcribeNote: (payload: { s3_key?: string; simulated_transcript?: string; detected_language?: string }) =>
    request("/care-notes/transcribe", { method: "POST", body: JSON.stringify(payload) }),
  generateNote: (payload: { resident_id: string; transcript: string; note_type: string; original_language?: string; original_transcript?: string }) =>
    request("/care-notes/generate", { method: "POST", body: JSON.stringify(payload) }),
  previewFamilyUpdate: (payload: { resident: string; note_summary: string }) =>
    request("/family/updates/preview", { method: "POST", body: JSON.stringify(payload) }),
};
