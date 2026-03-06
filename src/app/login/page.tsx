"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validateApiKey, setStoredApiKey } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) {
      setError("Please enter an API key.");
      return;
    }

    setError(null);
    setLoading(true);

    const valid = await validateApiKey(key);

    if (valid) {
      setStoredApiKey(key);
      router.replace("/");
    } else {
      setError("Invalid API key. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        {/* Logo / title */}
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">💬</p>
          <h1 className="text-xl font-semibold text-gray-800">Knowledge Base Chat</h1>
          <p className="text-sm text-gray-500 mt-1">Powered by Amazon Bedrock</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Verifying…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
