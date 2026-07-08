"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { decodeSessionSummary } from "../../lib/auth-cookie";

/* ── Types ───────────────────────────────────────────────────────── */
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
};

type UserCtx = { role: string; careHomeName: string };

/* ── Quick-prompt chips ──────────────────────────────────────────── */
const QUICK_PROMPTS = [
  { label: "Write care note",        prompt: "Help me write a care note for a resident" },
  { label: "Falls risk",             prompt: "Help me assess falls risk for a resident" },
  { label: "CQC guidance",           prompt: "What are the CQC key questions and how do I evidence them?" },
  { label: "Safeguarding alert",     prompt: "I have a safeguarding concern — what should I do?" },
  { label: "Shift handover",         prompt: "Help me write a shift handover summary" },
  { label: "Medication query",       prompt: "I have a question about medication administration" },
  { label: "Deterioration signs",    prompt: "What early signs of deterioration should I look for?" },
  { label: "NEWS2 scoring",          prompt: "Help me complete a NEWS2 score and determine escalation" },
];

/* ── Page context hints sent to the backend ─────────────────────── */
const PAGE_CONTEXT: Record<string, string> = {
  "/dashboard":        "Viewing the main care home dashboard.",
  "/residents":        "Reviewing or managing resident records.",
  "/mar":              "Administering medications from the MAR chart.",
  "/incidents":        "Recording or reviewing incident reports.",
  "/cqc":              "Working on CQC compliance evidence.",
  "/rota":             "Managing staff rotas and shift cover.",
  "/safeguarding":     "Handling a safeguarding concern.",
  "/clinical/vitals":  "Recording vital signs and NEWS2 observations.",
  "/clinical/wounds":  "Documenting wound care.",
  "/clinical/fluids":  "Tracking fluid intake and output.",
  "/clinical/nutrition": "Recording nutrition assessments.",
  "/clinical/eol":     "Supporting end-of-life care planning.",
  "/shift-notes":      "Recording shift notes.",
  "/finance":          "Reviewing financial records.",
  "/reports":          "Generating compliance or operational reports.",
};

/* ── Session reader ──────────────────────────────────────────────── */
function readUserCtx(): UserCtx {
  try {
    const cookie = document.cookie
      .split("; ")
      .find((r) => r.startsWith("carehomeos.auth.summary="));
    if (!cookie) return { role: "care_home_admin", careHomeName: "the care home" };
    const raw = decodeURIComponent(cookie.split("=").slice(1).join("="));
    const parsed = raw.startsWith("{")
      ? (JSON.parse(raw) as Record<string, string>)
      : (decodeSessionSummary(raw) as Record<string, string> | null) ?? {};
    return {
      role: parsed?.role ?? "care_home_admin",
      careHomeName: parsed?.careHomeName ?? "the care home",
    };
  } catch {
    return { role: "care_home_admin", careHomeName: "the care home" };
  }
}

/* ── Markdown-lite renderer ──────────────────────────────────────── */
function renderMarkdown(text: string): string {
  return text
    .replace(/🔴 SAFEGUARDING ALERT/g, '<strong class="aiAlertSafeguarding">🔴 SAFEGUARDING ALERT</strong>')
    .replace(/🟠 CLINICAL CONCERN/g,   '<strong class="aiAlertClinical">🟠 CLINICAL CONCERN</strong>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm,  "<h3>$1</h3>")
    .replace(/^# (.+)$/gm,   "<h2>$1</h2>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$1. $2</li>")
    .replace(/(<li>.*?<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

/* ── Message bubble ──────────────────────────────────────────────── */
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`aiMsg ${isUser ? "aiMsgUser" : "aiMsgAssistant"}`}>
      {!isUser && <span className="aiMsgAvatar">✦</span>}
      <div className="aiMsgBubble">
        {isUser ? (
          <p className="aiMsgContent">{msg.content}</p>
        ) : (
          <div
            className="aiMsgContent"
            // Safe: content comes from our own backend/LLM, not user-supplied HTML
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        )}
        {msg.isStreaming && <span className="aiStreamCursor" aria-hidden />}
        <span className="aiMsgTime">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function AIAssistantPanel() {
  const pathname                        = usePathname();
  const [open,     setOpen]             = useState(false);
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [input,    setInput]            = useState("");
  const [loading,  setLoading]          = useState(false);
  const [unread,   setUnread]           = useState(0);
  const endRef                          = useRef<HTMLDivElement>(null);
  const inputRef                        = useRef<HTMLTextAreaElement>(null);
  const userCtxRef                      = useRef<UserCtx>({ role: "care_home_admin", careHomeName: "the care home" });

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/sign-out") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/family");

  useEffect(() => { userCtxRef.current = readUserCtx(); }, []);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      const aId = `a-${Date.now()}`;
      const aMsg: ChatMessage = { id: aId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true };
      setMessages((prev) => [...prev, aMsg]);

      const pageCtx = Object.entries(PAGE_CONTEXT).find(([k]) => pathname.startsWith(k))?.[1] ?? "";
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            context: {
              role:         userCtxRef.current.role,
              careHomeName: userCtxRef.current.careHomeName,
              page:         pathname,
              pageContext:  pageCtx,
            },
          }),
        });

        if (!res.body) throw new Error("No stream body from server.");

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value, { stream: true }).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6)) as { delta?: string; done?: boolean; error?: string };
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.delta) {
                accumulated += parsed.delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aId ? { ...m, content: accumulated, isStreaming: !parsed.done } : m,
                  ),
                );
              }
              if (parsed.done) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === aId ? { ...m, isStreaming: false } : m)),
                );
              }
            } catch { /* skip malformed SSE line */ }
          }
        }
        if (!open) setUnread((n) => n + 1);
      } catch (err) {
        const errText = err instanceof Error ? err.message : "AI temporarily unavailable.";
        setMessages((prev) =>
          prev.map((m) => (m.id === aId ? { ...m, content: errText, isStreaming: false } : m)),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, open, pathname],
  );

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
  };

  if (isPublic) return null;

  return (
    <>
      {/* ── Floating trigger ─────────────────────────────────────── */}
      <button
        type="button"
        className={`aiTrigger${open ? " aiTriggerOpen" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open CareHomeOS AI assistant"}
        title="CareHomeOS AI Assistant (✦)"
      >
        {open ? "✕" : (
          <>
            <span className="aiTriggerIcon">✦</span>
            <span className="aiTriggerLabel">AI</span>
            {unread > 0 && <span className="aiTriggerBadge">{unread}</span>}
          </>
        )}
      </button>

      {/* ── Panel ────────────────────────────────────────────────── */}
      {open && (
        <div className="aiPanel" role="dialog" aria-modal="true" aria-label="CareHomeOS AI Assistant">

          {/* Header */}
          <div className="aiPanelHeader">
            <div className="aiPanelHeaderLeft">
              <span className="aiPanelLogo">✦</span>
              <div>
                <strong>CareHomeOS AI</strong>
                <small>Claude · Context-aware · UK care regulations</small>
              </div>
            </div>
            <button type="button" className="aiPanelClose" onClick={() => setOpen(false)} aria-label="Close AI panel">✕</button>
          </div>

          {/* Messages */}
          <div className="aiPanelMessages" role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="aiWelcome">
                <p className="aiWelcomeTitle">How can I help?</p>
                <p className="aiWelcomeSub">
                  Ask me anything about residents, CQC compliance, medication, safeguarding,
                  or care documentation. I&apos;m context-aware and UK-regulation trained.
                </p>
                <div className="aiQuickGrid">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      className="aiQuickChip"
                      onClick={() => void send(q.prompt)}
                      disabled={loading}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => <Bubble key={m.id} msg={m} />)}

            {loading && messages.at(-1)?.role === "assistant" && messages.at(-1)?.content === "" && (
              <div className="aiTyping" aria-label="AI is typing">
                <span /><span /><span />
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="aiPanelFooter">
            <div className="aiInputRow">
              <textarea
                ref={inputRef}
                className="aiInput"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask about residents, CQC, medications, safeguarding…"
                rows={2}
                disabled={loading}
                aria-label="Message input"
              />
              <button
                type="button"
                className={`aiSendBtn${loading ? " aiSendBtnBusy" : ""}`}
                onClick={() => void send(input)}
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                {loading ? "·" : "↑"}
              </button>
            </div>
            <p className="aiDisclaimer">
              AI is assistive only · Always apply clinical judgement · Not a substitute for medical advice
            </p>
          </div>
        </div>
      )}
    </>
  );
}
