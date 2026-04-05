"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Brain, Plus, Search, MessageSquare } from "lucide-react";
import { AUTH_KEY } from "@/lib/auth";
import { Message } from "./MessageBubble";

export interface SessionSummary {
  sessionId: string;
  createdAt: number;
  preview: string;
}

interface HistorySidebarProps {
  isOpen: boolean;
  currentSessionId: string;
  onSelectSession: (sessionId: string, messages: Message[]) => void;
  onNewChat: () => void;
  onClose: () => void;
  userId?: string;
  /** Optimistically insert a new session at the top */
  newSession?: { sessionId: string; preview: string } | null;
}

function relativeTime(ts: number, t: ReturnType<typeof useTranslations>): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("history.justNow");
  if (diffMin < 60) return t("history.minutesAgo", { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("history.hoursAgo", { n: diffH });
  return t("history.daysAgo", { n: Math.floor(diffH / 24) });
}

export default function HistorySidebar({
  isOpen,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onClose,
  userId,
  newSession,
}: HistorySidebarProps) {
  const t = useTranslations();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const apiKey = localStorage.getItem(AUTH_KEY);
      const url = userId
        ? `/api/sessions?userId=${encodeURIComponent(userId)}`
        : "/api/sessions";
      const res = await fetch(url, {
        headers: apiKey ? { "x-api-key": apiKey } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  // Reset and re-fetch when userId changes
  useEffect(() => {
    setSessions([]);
    fetchSessions();
  }, [fetchSessions]);

  // Optimistically insert new session from parent
  useEffect(() => {
    if (!newSession) return;
    setSessions((prev) => {
      if (prev.some((s) => s.sessionId === newSession.sessionId)) return prev;
      return [{ sessionId: newSession.sessionId, createdAt: Date.now(), preview: newSession.preview }, ...prev];
    });
  }, [newSession]);

  const handleSelect = async (sessionId: string) => {
    const apiKey = localStorage.getItem(AUTH_KEY);
    const res = await fetch(`/api/session?sessionId=${sessionId}`, {
      headers: apiKey ? { "x-api-key": apiKey } : {},
    });
    if (res.ok) {
      const data = await res.json();
      const messages: Message[] = (data.messages ?? []).map(
        (m: { role: string; content: string }, i: number) => ({
          id: `history-${i}`,
          role: m.role as "user" | "assistant",
          content: m.content,
          citations: [],
        })
      );
      onSelectSession(sessionId, messages);
    }
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const apiKey = localStorage.getItem(AUTH_KEY);
    await fetch("/api/session", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ sessionId }),
    });
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-[280px] bg-kb-bg-secondary flex flex-col
          z-20 transition-transform duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:z-auto
          ${isOpen ? "" : "lg:-translate-x-full lg:hidden"}
        `}
      >
        {/* Header: Logo + New Chat */}
        <div className="flex items-center justify-between px-4 pt-6 pb-0">
          <div className="flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-kb-accent" />
            <span className="text-lg font-bold text-kb-text-primary">Bedrock KB</span>
          </div>
          <button
            onClick={onNewChat}
            className="p-2 rounded-lg bg-kb-bg-input hover:bg-kb-border transition-colors"
          >
            <Plus className="w-[18px] h-[18px] text-kb-text-secondary" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-kb-bg-input border border-kb-border">
            <Search className="w-4 h-4 text-kb-text-muted shrink-0" />
            <span className="text-[13px] text-kb-text-muted">Search conversations...</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 mt-4 h-px bg-kb-border" />

        {/* Section label */}
        <div className="px-4 pt-4 pb-2">
          <span className="text-[11px] font-semibold tracking-wider text-kb-text-muted uppercase">
            Recent
          </span>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-0.5">
            {loading ? (
              <div className="flex justify-center py-8">
                <span className="text-kb-text-muted text-sm">…</span>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-center text-sm text-kb-text-muted py-8">
                {t("history.empty")}
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.sessionId}
                  onClick={() => handleSelect(s.sessionId)}
                  className={`
                    group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                    ${currentSessionId === s.sessionId
                      ? "bg-kb-accent text-kb-white"
                      : "hover:bg-kb-bg-input text-kb-text-secondary"
                    }
                  `}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${currentSessionId === s.sessionId ? "text-kb-white" : "text-kb-text-muted"
                    }`} />
                  <span className={`text-[13px] truncate flex-1 ${currentSessionId === s.sessionId ? "font-medium text-kb-white" : ""
                    }`}>
                    {s.preview || "…"}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, s.sessionId)}
                    title={t("history.delete")}
                    className="opacity-0 group-hover:opacity-100 shrink-0 w-5 h-5 flex items-center justify-center text-kb-text-muted hover:text-kb-accent transition-all"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
