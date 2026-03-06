"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ChatWindow from "@/components/ChatWindow";
import { clearStoredApiKey } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const router = useRouter();
  const t = useTranslations();

  const handleLogout = () => {
    clearStoredApiKey();
    router.replace("/login");
  };

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto px-4">
      <header className="py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            💬 {t("layout.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("layout.subtitle")}
          </p>
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
        <ChatWindow />
      </Suspense>
    </main>
  );
}
