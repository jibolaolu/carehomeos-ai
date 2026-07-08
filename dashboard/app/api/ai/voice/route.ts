import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "../../../../lib/api-base";

export const dynamic = "force-dynamic";

// Max audio upload: 25 MB (Whisper limit is 25 MB)
export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  const apiBase = getApiBase();

  try {
    const formData = await request.formData();
    const residentId = formData.get("resident_id") as string | null;
    const noteType  = formData.get("note_type")   as string | null;
    const audio     = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Forward the multipart form to the backend
    const backendForm = new FormData();
    backendForm.append("audio", audio, "recording.m4a");
    if (residentId) backendForm.append("resident_id", residentId);
    if (noteType)   backendForm.append("note_type", noteType);

    const res = await fetch(`${apiBase}/notes/transcribe-and-generate`, {
      method: "POST",
      body: backendForm,
      signal: AbortSignal.timeout(60_000), // transcription can take up to 30 s
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      return NextResponse.json(
        { error: err.detail ?? `Transcription failed: HTTP ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Voice processing failed: ${msg}` }, { status: 503 });
  }
}
