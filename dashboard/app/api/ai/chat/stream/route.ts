import { NextRequest } from "next/server";
import { getApiBase } from "../../../../../lib/api-base";

export const dynamic = "force-dynamic";

// Proxy the SSE stream from the FastAPI backend to the browser.
// Next.js Node runtime supports ReadableStream passthrough natively.
export async function POST(request: NextRequest) {
  const apiBase = getApiBase();
  const body = await request.json() as Record<string, unknown>;

  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };

  try {
    const res = await fetch(`${apiBase}/ai/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const errData = JSON.stringify({ error: "Backend unavailable", done: true });
      return new Response(`data: ${errData}\n\n`, { headers: sseHeaders });
    }

    // Pass the backend stream directly to the browser.
    return new Response(res.body, { headers: sseHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errData = JSON.stringify({ error: msg, done: true });
    return new Response(`data: ${errData}\n\n`, { headers: sseHeaders });
  }
}
