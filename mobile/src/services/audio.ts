export type RecordingState = "idle" | "recording" | "reviewing" | "uploading";

export async function startVoiceNote(): Promise<{ state: RecordingState; startedAt: string }> {
  return { state: "recording", startedAt: new Date().toISOString() };
}

export async function stopVoiceNote(): Promise<{ state: RecordingState; localUri: string; durationSeconds: number }> {
  return { state: "reviewing", localUri: "file://local-care-note.m4a", durationSeconds: 42 };
}

export async function uploadVoiceNote(localUri: string): Promise<{ s3Key: string; deletedAfterTranscription: boolean }> {
  return {
    s3Key: `audio-temp/${localUri.split("/").pop() ?? "care-note.m4a"}`,
    deletedAfterTranscription: true,
  };
}
