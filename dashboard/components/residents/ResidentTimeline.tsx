"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBase } from "../../lib/api-base";

type CareNoteItem = {
  id: string;
  resident_id: string;
  resident: string;
  type: string;
  summary: string;
  confidence: number;
  route: string;
  cqc_tags: string[];
  recorded_by?: string;
  recorded_role?: string;
  created_at?: string;
};

const apiBase = getApiBase();

function formatCheckedAt(value: string | null) {
  if (!value) return "refresh every 5 seconds · waiting for first pull";
  const date = new Date(value);
  return `refresh every 5 seconds · last pull ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

function formatRelativeTime(value?: string) {
  if (!value) return "just now";
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  return `${Math.round(diffMinutes / 60)} hr ago`;
}

export default function ResidentTimeline({ resident, residentId }: { resident: string; residentId: string }) {
  const [notes, setNotes] = useState<CareNoteItem[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      try {
        const response = await fetch(`${apiBase}/care-notes`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as CareNoteItem[];
        if (!cancelled) {
          setNotes(payload);
          setCheckedAt(new Date().toISOString());
        }
      } catch {
        // keep latest successful timeline visible
      }
    }

    loadNotes();
    const interval = window.setInterval(loadNotes, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const residentNotes = useMemo(
    () => [...notes]
      .filter((note) => note.resident_id === residentId || note.resident === resident)
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()),
    [notes, resident, residentId],
  );

  const latest = residentNotes[0];

  return (
    <div className="card residentTimelineCard">
      <div className="residentTimelineHeader">
        <div>
          <h3 className="sectionTitle">Live care note timeline</h3>
          <p className="muted residentTimelineLead">Latest documentation, routing, and escalation context for this resident before handover or review.</p>
        </div>
        <div className="residentTimelineSummary">
          <span className="badge success">{residentNotes.length} notes</span>
          <span className="liveStatusLine"><span className="liveDot" /> {formatCheckedAt(checkedAt)}</span>
        </div>
      </div>

      {latest ? (
        <div className="residentTimelineHighlight">
          <div>
            <p className="metricLabel">Latest note left in the service</p>
            <strong>{latest.type}</strong>
            <p className="muted">{latest.summary}</p>
            <div className="dashboardFeedMeta">
              <span>{latest.recorded_by ?? "Care team"}</span>
              <span>{latest.recorded_role ?? "Reporting staff"}</span>
              <span>{formatRelativeTime(latest.created_at)}</span>
            </div>
          </div>
          <span className={latest.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{latest.route} {Math.round(latest.confidence * 100)}%</span>
        </div>
      ) : null}

      <ul className="list residentTimelineList">
        {residentNotes.map((note) => (
          <li className="listItem residentTimelineItem" key={note.id}>
            <div>
              <strong>{note.type}</strong>
              <div className="muted">{note.summary}</div>
              <div className="dashboardFeedMeta residentTimelineMeta">
                <span>{note.recorded_by ?? "Care team"}</span>
                <span>{note.recorded_role ?? "Reporting staff"}</span>
                <span>{formatRelativeTime(note.created_at)}</span>
              </div>
            </div>
            <div className="residentTimelineBadges">
              <span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{note.route}</span>
              <span className="badge">{note.cqc_tags.join(" · ")}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}