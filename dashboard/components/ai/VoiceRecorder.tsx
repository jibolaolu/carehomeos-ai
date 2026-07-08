"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  residentId?: string;
  noteType?: string;
  onResult?: (transcript: string, generatedNote: string) => void;
  onCancel?: () => void;
};

type RecordState = "idle" | "recording" | "processing" | "done" | "error";

export default function VoiceRecorder({ residentId, noteType = "general", onResult, onCancel }: Props) {
  const [state,      setState]      = useState<RecordState>("idle");
  const [seconds,    setSeconds]    = useState(0);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [transcript, setTranscript] = useState("");
  const [generated,  setGenerated]  = useState("");

  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_SECONDS = 120;

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => { stopTimer(); mediaRef.current?.stop(); }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        if (residentId) form.append("resident_id", residentId);
        form.append("note_type", noteType);

        try {
          const res = await fetch("/api/ai/voice", { method: "POST", body: form });
          const data = await res.json() as { transcript?: string; generated_note?: string; error?: string };
          if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
          const t = data.transcript ?? "";
          const g = data.generated_note ?? "";
          setTranscript(t);
          setGenerated(g);
          setState("done");
          onResult?.(t, g);
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : "Transcription failed.");
          setState("error");
        }
      };

      recorder.start(250);
      mediaRef.current = recorder;
      setSeconds(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            recorder.stop();
            return s + 1;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Microphone access denied.");
      setState("error");
    }
  }, [noteType, onResult, residentId]);

  const stopRecording = () => {
    mediaRef.current?.stop();
    stopTimer();
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const pct = Math.min((seconds / MAX_SECONDS) * 100, 100);

  return (
    <div className="voiceRecorder">
      {(state === "idle" || state === "error") && (
        <>
          <button type="button" className="voiceRecordBtn" onClick={() => void startRecording()}>
            <span className="voiceRecordIcon">🎙</span>
            Start recording
          </button>
          {state === "error" && <p className="voiceError">{errorMsg}</p>}
        </>
      )}

      {state === "recording" && (
        <div className="voiceActive">
          <div className="voiceMeter" aria-label={`Recording: ${fmt(seconds)}`}>
            <span className="voiceLiveDot" />
            <span className="voiceTimer">{fmt(seconds)}</span>
            <div className="voiceProgress">
              <div className="voiceProgressBar" style={{ width: `${pct}%` }} />
            </div>
            <span className="voiceTimerMax">{fmt(MAX_SECONDS)}</span>
          </div>
          <button type="button" className="voiceStopBtn" onClick={stopRecording}>
            ⏹ Stop
          </button>
        </div>
      )}

      {state === "processing" && (
        <div className="voiceProcessing">
          <span className="voiceSpinner" aria-label="Transcribing" />
          <span>Transcribing with Whisper…</span>
        </div>
      )}

      {state === "done" && (
        <div className="voiceDone">
          {transcript && (
            <div className="voiceSection">
              <p className="voiceSectionLabel">Transcript</p>
              <p className="voiceTranscript">{transcript}</p>
            </div>
          )}
          {generated && (
            <div className="voiceSection">
              <p className="voiceSectionLabel">AI-generated note</p>
              <p className="voiceGenerated">{generated}</p>
            </div>
          )}
          <div className="voiceActions">
            <button type="button" className="btn primary" onClick={() => onResult?.(transcript, generated)}>
              Use this note
            </button>
            <button type="button" className="btn" onClick={() => { setState("idle"); setTranscript(""); setGenerated(""); }}>
              Record again
            </button>
            {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
          </div>
        </div>
      )}
    </div>
  );
}
