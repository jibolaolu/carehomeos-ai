"use client";

import Link from "next/link";
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
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((now - then) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} hr ago`;
}

export default function DashboardLiveFeed() {
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
        // keep the latest successful feed in the UI
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
    () => [...notes].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()),
    [notes],
  );

  const pendingReview = orderedNotes.filter((note) => note.route !== "AUTO_FILE").length;
  const autoFiled = orderedNotes.filter((note) => note.route === "AUTO_FILE").length;
  const latest = orderedNotes[0];

  return (
    <section className="card dashboardLiveFeedCard">
      <div className="pageHeader dashboardFeedHeader">
        <div>
          <span className="badge success">Live care-note feed</span>
          <h3 className="sectionTitle">Notes left by staff, carers, and senior nurses</h3>
          <p className="muted dashboardFeedLead">Managers can see new documentation land in the dashboard in near real time before sign-off, escalation, or family follow-up.</p>
          <div className="liveStatusLine"><span className="liveDot" /> {formatCheckedAt(checkedAt)}</div>
        </div>
        <div className="dashboardFeedStats">
          <div><strong>{orderedNotes.length}</strong><span>Total notes</span></div>
          <div><strong>{pendingReview}</strong><span>Pending review</span></div>
          <div><strong>{autoFiled}</strong><span>Auto-filed</span></div>
        </div>
      </div>

      {latest ? (
        <div className="dashboardFeedHighlight">
          <div className="dashboardFeedHighlightCopy">
            <p className="metricLabel">Latest note left in the service</p>
            <strong>{latest.resident} · {latest.type}</strong>
            <p className="muted">{latest.summary}</p>
            <div className="dashboardFeedMeta">
              <span>{latest.recorded_by ?? "Care team"}</span>
              <span>{latest.recorded_role ?? "Reporting staff"}</span>
              <span>{formatRelativeTime(latest.created_at)}</span>
            </div>
          </div>
          <div className="dashboardFeedHighlightSide">
            <span className={latest.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{latest.route} {Math.round(latest.confidence * 100)}%</span>
            <Link href={`/residents/${latest.resident_id}`} className="btn primary">Open resident</Link>
          </div>
        </div>
      ) : null}

      <div className="dashboardFeedGrid">
        {orderedNotes.slice(0, 4).map((note) => (
          <Link key={note.id} href={`/residents/${note.resident_id}`} className="dashboardNoteCard interactiveCard">
            <div className="dashboardNoteCardTop">
              <span className="badge">{note.type}</span>
              <span className="muted">{formatRelativeTime(note.created_at)}</span>
            </div>
            <strong>{note.resident}</strong>
            <p className="muted">{note.summary}</p>
            <div className="dashboardFeedMeta">
              <span>{note.recorded_by ?? "Care team"}</span>
              <span>{note.recorded_role ?? "Reporting staff"}</span>
            </div>
            <span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{note.route} {Math.round(note.confidence * 100)}%</span>
          </Link>
        ))}
      </div>

      <div className="tableWrap dashboardFeedTableWrap">
        <table>
          <thead>
            <tr><th>Resident</th><th>Note left</th><th>Recorded by</th><th>Route</th><th>CQC tags</th></tr>
          </thead>
          <tbody>
            {orderedNotes.map((note) => (
              <tr key={note.id} className="clickableRow">
                <td><Link href={`/residents/${note.resident_id}`}><strong>{note.resident}</strong><br /><span className="muted">{note.type}</span></Link></td>
                <td><Link href={`/residents/${note.resident_id}`}>{note.summary}</Link></td>
                <td><Link href={`/residents/${note.resident_id}`}><strong>{note.recorded_by ?? "Care team"}</strong><br /><span className="muted">{note.recorded_role ?? "Reporting staff"}</span></Link></td>
                <td><Link href={`/residents/${note.resident_id}`}><span className={note.route === "AUTO_FILE" ? "badge success" : "badge warning"}>{note.route} {Math.round(note.confidence * 100)}%</span></Link></td>
                <td><Link href={`/residents/${note.resident_id}`}>{note.cqc_tags.join(", ")}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}