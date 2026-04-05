"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Database, Settings } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import HistorySidebar from "@/components/HistorySidebar";
import { clearStoredApiKey } from "@/lib/auth";
import { Message } from "@/components/MessageBubble";
import { v4 as uuidv4 } from "uuid";

function HomeContent() {
  const router = useRouter();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;     // 实际传给 API
  const kbId = searchParams.get("kbId") ?? undefined;         // 实际传给 API
  const userLabel = searchParams.get("user") ?? undefined;    // 仅显示
  const kbLabel = searchParams.get("kb") ?? undefined;        // 仅显示

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[] | null>(null);
  const [chatTitle, setChatTitle] = useState("New Chat");
  const [modelName, setModelName] = useState("");
  const [newSession, setNewSession] = useState<{ sessionId: string; preview: string } | null>(null);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => setModelName(d.modelName)).catch(() => { });
  }, []);

  // Reset chat state when userId changes
  useEffect(() => {
    setActiveSessionId(null);
    setActiveMessages(null);
    setChatTitle("New Chat");
    setNewSession(null);
  }, [userId]);

  const handleLogout = () => {
    clearStoredApiKey();
    router.replace("/login");
  };

  const handleSelectSession = useCallback(
    (sessionId: string, messages: Message[]) => {
      setActiveSessionId(sessionId);
      setActiveMessages(messages);
      const firstUser = messages.find((m) => m.role === "user");
      setChatTitle(firstUser?.content.slice(0, 30) ?? "Chat");
    },
    []
  );

  const handleNewChat = useCallback(() => {
    setActiveSessionId(uuidv4());
    setActiveMessages([]);
    setChatTitle("New Chat");
  }, []);

  const handleFirstMessage = useCallback((sid: string, preview: string) => {
    setChatTitle(preview.slice(0, 30));
    setNewSession({ sessionId: sid, preview });
  }, []);

  return (
    <div className="flex h-screen bg-kb-bg-primary overflow-hidden">
      {/* Sidebar */}
      <HistorySidebar
        isOpen={sidebarOpen}
        currentSessionId={activeSessionId ?? ""}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onClose={() => setSidebarOpen(false)}
        userId={userId}
        newSession={newSession}
      />

      {/* Main Chat Area */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-kb-border">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={t("header.history")}
              aria-label={t("header.history")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-kb-text-secondary hover:bg-kb-bg-input transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-kb-text-primary">{chatTitle}</h1>
            {modelName && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50">
                <div className="w-1.5 h-1.5 rounded-full bg-kb-success" />
                <span className="text-[11px] font-medium text-kb-accent">{modelName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {kbLabel && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-kb-border text-kb-text-secondary text-xs">
                <Database className="w-3.5 h-3.5" />
                {kbLabel}
              </span>
            )}
            {userLabel && (
              <span className="px-2.5 py-1.5 rounded-lg border border-kb-border text-kb-text-muted text-xs">
                {userLabel}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg border border-kb-border text-kb-text-secondary hover:bg-kb-bg-input transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat */}
        <ChatWindow
          externalSessionId={activeSessionId}
          externalMessages={activeMessages ?? undefined}
          userId={userId}
          kbId={kbId}
          onFirstMessage={handleFirstMessage}
        />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-white" />}>
      <HomeContent />
    </Suspense>
  );
}
