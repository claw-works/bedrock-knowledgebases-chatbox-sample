"use client";

import { useRouter } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";
import { clearStoredApiKey } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  const handleLogout = () => {
    clearStoredApiKey();
    router.replace("/login");
  };

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto px-4">
      <header className="py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            💬 Knowledge Base Chat
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Powered by Amazon Bedrock
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          Sign out
        </button>
      </header>
      <ChatWindow />
    </main>
  );
}
