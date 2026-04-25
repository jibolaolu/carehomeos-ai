"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CareNoteItem = {
  id: string;
  resident_id: string;
  resident: string;
  type: string;
  summary: string;
  confidence: number;
  route: string;
  recorded_by?: string;
  recorded_role?: string;
  created_at?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";

function formatRelativeTime(value?: string) {
  if (!value) return "just now";
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  return `${Math.round(diffMinutes / 60)} hr ago`;
}

export default function DashboardNotesRail() {
  const [notes, setNotes] = useState<CareNoteItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      try {
        const response = await fetch(`${apiBase}/care-notes`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as CareNoteItem[];
        if (!cancelled) {
          setNotes(payload);
        }
      } catch {
        // keep latest successful notes visible
      }
    }

    loadNotes();
    const interval = window.setInterval(loadNotes, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const orderedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 4),
    [notes],
  );

  return (
    <div className="railSection">
      <div className="railHeader compactRailHeader">
        <div>
          <h3 className="railTitle">Latest care notes</h3>
          <p className="muted">Staff and carer documentation stream</p>
        </div>
        <span className="badge success">Live</span>
      </div>
      {orderedNotes.map((note) => (
        <Link className="railItem interactiveRailItem noteRailItem" href={`/residents/${note.resident_id}`} key={note.id}>
          <strong>{note.resident}</strong>
          <span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{note.type}</span>
          <div className="railMeta">
            <span>{note.summary}</span>
            <span>{note.recorded_by ?? "Care team"} · {note.recorded_role ?? "Reporting staff"}</span>
            <span>{formatRelativeTime(note.created_at)} · {Math.round(note.confidence * 100)}% confidence</span>
          </div>
        </Link>
      ))}
    </div>
  );
}