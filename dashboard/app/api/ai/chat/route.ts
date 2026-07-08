import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "../../../../lib/api-base";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiBase = getApiBase();
  const body = await request.json() as Record<string, unknown>;

  try {
    const res = await fetch(`${apiBase}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      return NextResponse.json(
        { error: err.detail ?? `Backend error ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `AI unavailable: ${msg}` }, { status: 503 });
  }
}
