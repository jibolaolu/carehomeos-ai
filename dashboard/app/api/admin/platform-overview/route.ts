/**
 * /api/admin/platform-overview — server-side proxy to the Python backend.
 *
 * Why this exists
 * ───────────────
 * The PlatformAdminClient used to call the backend directly from the browser
 * (client-side fetch to https://carehomeos-api.localtest.me). That approach
 * has two failure modes:
 *
 *   1. CORS: browser blocks cross-origin requests when the API subdomain's
 *      CORS headers are missing or misconfigured.
 *   2. nginx dependency: requires nginx to be routing the API subdomain,
 *      which is not always set up the same way across developer machines.
 *
 * This Next.js route makes the fetch SERVER-SIDE:
 *   • No CORS (server-to-server HTTP call)
 *   • Direct HTTP to http://127.0.0.1:{CAREHOMEOS_API_PORT} — no nginx needed
 *   • Works even if the browser has no route to carehomeos-api.localtest.me
 *
 * The component polls this route every 5 s, which is cheap since Next.js
 * is already running in the same process.
 */
import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "../../../../lib/api-base";

// Always fetch fresh — this is a live health-poll endpoint.
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const apiBase = getApiBase(); // server-side → http://127.0.0.1:8105/api/v1

  try {
    const response = await fetch(`${apiBase}/admin/platform-overview`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      // Short timeout so the poll doesn't hang for 30 s when the backend is
      // not running — Node 18+ supports AbortSignal.timeout natively.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as Record<string, string>;
      return NextResponse.json(
        {
          _proxy_error: true,
          detail: body.detail ?? body.message ?? `Backend returned HTTP ${response.status}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("TimeoutError") || message.includes("timeout") || message.includes("abort");

    return NextResponse.json(
      {
        _proxy_error: true,
        detail: isTimeout
          ? `Backend did not respond within 8 s. Make sure the backend is running on port ${process.env.CAREHOMEOS_API_PORT ?? "8105"}.`
          : `Backend unreachable: ${message}. Run ./run-local.sh to start all services.`,
      },
      { status: 503 },
    );
  }
}
