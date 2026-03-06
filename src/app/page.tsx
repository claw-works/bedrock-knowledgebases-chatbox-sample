"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";
import { clearStoredApiKey } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();

  const handleLogout = () => {
    clearStoredApiKey();
    router.replace("/login");
  };

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto px-4">
      <header className="py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            💬 Knowledge Base Chat
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Powered by Amazon Bedrock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Sign out
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
