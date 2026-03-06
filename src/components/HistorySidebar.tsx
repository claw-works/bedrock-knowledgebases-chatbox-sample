"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
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
}: HistorySidebarProps) {
  const t = useTranslations();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  const handleSelect = async (sessionId: string) => {
    const res = await fetch(`/api/session?sessionId=${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      // Convert DynamoDB messages to Message[] format
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
    await fetch("/api/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-10 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          z-20 flex flex-col transition-transform duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto
          ${!isOpen ? "lg:hidden" : ""}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("history.title")}
          </span>
          <div className="flex gap-1">
            <button
              onClick={onNewChat}
              title={t("history.newChat")}
              className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {t("history.newChat")}
            </button>
            <button
              onClick={onClose}
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="text-gray-400 text-sm">…</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-600 py-8">
              {t("history.empty")}
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.sessionId}
                onClick={() => handleSelect(s.sessionId)}
                className={`
                  group flex items-start gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                  ${currentSessionId === s.sessionId ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                `}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {s.preview || "…"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                    {relativeTime(s.createdAt, t)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, s.sessionId)}
                  title={t("history.delete")}
                  className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
