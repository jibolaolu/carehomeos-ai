/** Normalized backend API base URL — always includes /api/v1 suffix. */
export function getApiBase(): string {
  // Server-side route handlers must hit the backend directly over HTTP to
  // avoid Node.js rejecting the self-signed TLS cert on the nginx proxy.
  if (typeof window === "undefined") {
    const internal = process.env.API_INTERNAL_BASE_URL;
    if (internal) {
      const t = internal.replace(/\/$/, "");
      if (t.endsWith("/api/v1")) return t;
      if (t.endsWith("/api")) return `${t}/v1`;
      return `${t}/api/v1`;
    }
    // Fallback: derive from API port for local dev
    const port = process.env.CAREHOMEOS_API_PORT ?? "8105";
    return `http://127.0.0.1:${port}/api/v1`;
  }

  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";
  const trimmed = raw.replace(/\/$/, "");
  if (trimmed.endsWith("/api/v1")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
}

export function getCareHomeId(): string {
  if (typeof window === "undefined") return "home-oakfield";
  try {
    const raw = window.localStorage.getItem("carehomeos.user");
    if (raw) {
      const user = JSON.parse(raw) as { careHomeId?: string | null };
      if (user.careHomeId) return user.careHomeId;
    }
  } catch {
    // fall through to default
  }
  return "home-oakfield";
}

export async function fetchApi<T>(
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

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? body.message ?? response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
