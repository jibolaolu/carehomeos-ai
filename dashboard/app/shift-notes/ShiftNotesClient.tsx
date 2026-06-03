"use client";

import { useEffect, useRef, useState } from "react";
import { fetchApi, getApiBase } from "../../lib/api-base";

/* ── Web Speech API shim types (not always in TS lib) ────────────────── */
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ── Types ──────────────────────────────────────────────────────────────── */
type StructuredNote = {
  summary?: string;
  actions?: string[];
  concerns?: string[];
  note_type?: string;
};

type ShiftNote = {
  id: string;
  recorded_by: string;
  recorded_role: string;
  shift_date: string;
  note_type?: string;
  transcript: string;
  structured_note: StructuredNote;
  cqc_tags: string[];
  quality_gate: { passed: boolean; route: string; confidence?: number };
  source: "voice" | "text";
  original_language?: string;
  translation_applied?: boolean;
  created_at: string;
};

type Props = {
  userName: string;
  userRole: string;
  careHomeId: string;
};

const NOTE_TYPES = [
  { id: "shift",     label: "Shift observation" },
  { id: "handover",  label: "Handover note" },
  { id: "incident",  label: "Incident concern" },
  { id: "nutrition", label: "Nutrition & hydration" },
  { id: "mobility",  label: "Mobility & falls" },
  { id: "skin",      label: "Skin & pressure care" },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function routeBadge(route: string) {
  if (route === "AUTO_FILE") return <span className="badge success">Auto-filed</span>;
  if (route === "SOFT_FLAG") return <span className="badge warning">Soft flag</span>;
  if (route === "HOLD_FOR_REVIEW") return <span className="badge danger">Hold</span>;
  return <span className="badge">{route}</span>;
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function ShiftNotesClient({ userName, userRole, careHomeId }: Props) {
  const apiBase = getApiBase();

  /* State */
  const [notes, setNotes]             = useState<ShiftNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [selectedType, setSelectedType] = useState(NOTE_TYPES[0]);
  const [transcript, setTranscript]   = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ShiftNote | null>(null);

  /* Voice recording state */
  const [isRecording, setIsRecording]   = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  /* ── Check Web Speech API support ───────────────────────────────────── */
  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognition()));
  }, []);

  /* ── Fetch existing notes ────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchApi<ShiftNote[]>(`/shift-notes?care_home_id=${encodeURIComponent(careHomeId)}`);
        if (!cancelled) setNotes(data);
      } catch {
        /* non-fatal — empty list on error */
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiBase, careHomeId]);

  /* ── Voice recording ────────────────────────────────────────────────── */
  function startVoiceRecording() {
    const SpeechRecognitionAPI = getSpeechRecognition();
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalText = transcript;

    recognition.onstart = () => {
      setIsListening(true);
      setIsRecording(true);
      setLiveTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += (finalText ? " " : "") + result[0].transcript;
          setTranscript(finalText);
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript(interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setIsRecording(false);
    };

    recognition.start();
  }

  function stopVoiceRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setIsListening(false);
  }

  /* ── Submit note ──────────────────────────────────────────────────────── */
  async function submitNote() {
    if (!transcript.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const result = await fetchApi<ShiftNote>("/shift-notes", {
        method: "POST",
        body: JSON.stringify({
          care_home_id: careHomeId,
          recorded_by: userName,
          recorded_role: userRole.replaceAll("_", " "),
          transcript,
          note_type: selectedType.id,
        }),
      });
      setSubmitResult(result);
      setNotes((prev) => [result, ...prev]);
      setTranscript("");
      setLiveTranscript("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit shift note");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="dashboardGrid">
      {/* ── Left / main panel ──────────────────────────────────────── */}
      <div className="mainPanel">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Shift notes</p>
            <h2 className="pageTitle">Voice-to-CQC shift notes</h2>
            <p className="pageLead">
              Record your observations by voice or by typing. Notes are transcribed, structured, and tagged for CQC evidence automatically.
            </p>
          </div>
          <div className="topbarActions">
            <span className="badge success">Live</span>
          </div>
        </div>

        {/* ── Note type selector ─────────────────────────────────── */}
        <section className="card">
          <h3 className="sectionTitle">Note type</h3>
          <div className="grid" style={{ marginTop: 12, gap: 8 }}>
            {NOTE_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={selectedType.id === type.id ? "btn primary" : "btn"}
                onClick={() => setSelectedType(type)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Voice / text input ─────────────────────────────────── */}
        <section className="card">
          <div className="listItem" style={{ marginBottom: 12 }}>
            <h3 className="sectionTitle">Record {selectedType.label.toLowerCase()}</h3>
            {voiceSupported ? (
              <span className="badge success">Voice ready</span>
            ) : (
              <span className="badge">Type only</span>
            )}
          </div>

          {voiceSupported && (
            <div className="actions" style={{ marginBottom: 12 }}>
              {!isRecording ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={startVoiceRecording}
                  disabled={submitting}
                >
                  <span style={{ marginRight: 6 }}>🎙</span> Start voice recording
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={stopVoiceRecording}
                  style={{ background: "var(--danger)", color: "#fff" }}
                >
                  <span style={{ marginRight: 6 }}>⏹</span> Stop recording
                </button>
              )}
              {isListening && (
                <span className="badge warning" style={{ marginLeft: 8 }}>
                  <span className="liveDot" /> Listening…
                </span>
              )}
            </div>
          )}

          {liveTranscript && (
            <div className="notice" style={{ marginBottom: 12 }}>
              <strong>Live transcript</strong>
              <p style={{ fontStyle: "italic", marginTop: 4 }}>{liveTranscript}</p>
            </div>
          )}

          <label style={{ display: "block", marginBottom: 4 }}>
            <strong>Transcript</strong>
            <span className="muted" style={{ marginLeft: 8 }}>
              {voiceSupported ? "Voice fills this automatically, or type directly" : "Describe what you observed"}
            </span>
          </label>
          <textarea
            rows={5}
            placeholder="Resident appeared calm and engaged during morning routine…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={isRecording || submitting}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--card-border)",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          />

          <div className="actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => void submitNote()}
              disabled={submitting || !transcript.trim() || isRecording}
            >
              {submitting ? "Structuring note…" : "Submit & structure note"}
            </button>
          </div>

          {submitError && (
            <p style={{ color: "var(--danger)", marginTop: 8 }}>{submitError}</p>
          )}

          {submitResult && (
            <div className="notice" style={{ marginTop: 16 }}>
              <div className="listItem">
                <strong>CQC-structured note saved</strong>
                {routeBadge(submitResult.quality_gate?.route ?? "")}
              </div>
              <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                {submitResult.structured_note?.summary}
              </p>
              {(submitResult.structured_note?.actions ?? []).length > 0 && (
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {submitResult.structured_note.actions?.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              )}
              {submitResult.cqc_tags.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {submitResult.cqc_tags.map((tag) => (
                    <span key={tag} className="badge">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Shift notes history ─────────────────────────────────── */}
        <section className="card">
          <div className="listItem" style={{ marginBottom: 12 }}>
            <h3 className="sectionTitle">Shift notes today</h3>
            <span className="badge">{notes.length} notes</span>
          </div>

          {loadingNotes ? (
            <p className="muted">Loading shift notes…</p>
          ) : notes.length === 0 ? (
            <p className="muted">No shift notes recorded yet. Record your first observation above.</p>
          ) : (
            <ul className="list">
              {notes.map((note) => (
                <li key={note.id}>
                  <article className="railItem" style={{ padding: "12px 0", borderBottom: "1px solid var(--card-border)" }}>
                    <div className="listItem compactListItem">
                      <span>
                        <strong>{note.recorded_by}</strong>
                        <span className="muted" style={{ marginLeft: 6 }}>{note.recorded_role}</span>
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {note.source === "voice" && (
                          <span className="badge">🎙 Voice</span>
                        )}
                        {routeBadge(note.quality_gate?.route ?? "")}
                        <span className="muted">{formatTime(note.created_at)}</span>
                      </div>
                    </div>
                    <p style={{ marginTop: 6 }}>{note.structured_note?.summary}</p>
                    {(note.structured_note?.actions ?? []).length > 0 && (
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {note.structured_note.actions?.map((action, i) => (
                          <li key={i} className="muted">{action}</li>
                        ))}
                      </ul>
                    )}
                    {note.cqc_tags.length > 0 && (
                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {note.cqc_tags.map((tag) => (
                          <span key={tag} className="badge" style={{ fontSize: "0.7rem" }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    {note.translation_applied && (
                      <p className="muted" style={{ marginTop: 4, fontSize: "0.75rem" }}>
                        Translated from {note.original_language}
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Right rail ─────────────────────────────────────────────────── */}
      <aside className="rightRail dashboardRightRail">
        <div className="railHeader">
          <div>
            <h3 className="railTitle">Shift summary</h3>
            <p className="muted">Today's structured observations</p>
          </div>
          <span className="badge success">{notes.length}</span>
        </div>

        <div className="liveStatusLine">
          <span className="liveDot" /> Auto-updates as notes are filed
        </div>

        {notes.slice(0, 8).map((note) => (
          <div className="railItem" key={note.id}>
            <strong>{note.recorded_by}</strong>
            <span className={note.quality_gate?.passed ? "badge success" : "badge warning"}>
              {note.note_type}
            </span>
            <div className="railMeta">
              <span>{formatTime(note.created_at)}</span>
              <span>{note.quality_gate?.route}</span>
              {note.source === "voice" && <span>🎙 Voice</span>}
            </div>
          </div>
        ))}

        {notes.length === 0 && (
          <p className="muted" style={{ padding: "12px 0" }}>
            No notes yet this shift.
          </p>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <h4 className="sectionTitle">Recording tips</h4>
          <ul className="list" style={{ marginTop: 8 }}>
            <li className="listItem" style={{ padding: "6px 0" }}>
              <span><strong>Be specific</strong><br /><span className="muted">Name the resident, time, and observation</span></span>
            </li>
            <li className="listItem" style={{ padding: "6px 0" }}>
              <span><strong>Include actions</strong><br /><span className="muted">What you did and who was informed</span></span>
            </li>
            <li className="listItem" style={{ padding: "6px 0" }}>
              <span><strong>Flag concerns</strong><br /><span className="muted">Any deterioration, fall risk, or skin change</span></span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
