"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ChatWindow from "@/components/ChatWindow";
import HistorySidebar from "@/components/HistorySidebar";
import { clearStoredApiKey } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Message } from "@/components/MessageBubble";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();
  const t = useTranslations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[] | null>(null);

  const handleLogout = () => {
    clearStoredApiKey();
    router.replace("/login");
  };

  const handleSelectSession = useCallback(
    (sessionId: string, messages: Message[]) => {
      setActiveSessionId(sessionId);
      setActiveMessages(messages);
      setSidebarOpen(false);
    },
    []
  );

  const handleNewChat = useCallback(() => {
    setActiveSessionId(uuidv4());
    setActiveMessages([]);
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* History sidebar */}
      <HistorySidebar
        isOpen={sidebarOpen}
        currentSessionId={activeSessionId ?? ""}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <main className="flex flex-col flex-1 min-w-0 max-w-4xl mx-auto px-4">
        <header className="py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* History toggle button */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={t("header.history")}
              aria-label={t("header.history")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                💬 {t("layout.title")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t("layout.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {t("header.signOut")}
            </button>
          </div>
        </header>
        {/* Suspense required because ChatWindow uses useSearchParams() */}
        <Suspense fallback={<div className="flex-1" />}>
          <ChatWindow
            externalSessionId={activeSessionId}
            externalMessages={activeMessages ?? undefined}
          />
        </Suspense>
      </main>
    </div>
  );
}
