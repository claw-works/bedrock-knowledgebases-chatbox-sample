"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Brain } from "lucide-react";
import { validateApiKey, setStoredApiKey } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) {
      setError(t("errorEmpty"));
      return;
    }

    setError(null);
    setLoading(true);

    const valid = await validateApiKey(key);

    if (valid) {
      setStoredApiKey(key);
      router.replace("/");
    } else {
      setError(t("errorInvalid"));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-kb-bg-primary px-4">
      <div className="w-full max-w-sm bg-kb-bg-secondary rounded-2xl border border-kb-border p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-3">
            <Brain className="w-6 h-6 text-kb-accent" />
          </div>
          <h1 className="text-xl font-semibold text-kb-text-primary">{t("title")}</h1>
          <p className="text-sm text-kb-text-muted mt-1">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-kb-text-secondary mb-1"
            >
              {t("label")}
            </label>
            <input
              id="api-key"
              type="password"
              autoComplete="current-password"
              placeholder={t("placeholder")}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-kb-border bg-kb-bg-input text-kb-text-primary placeholder-kb-text-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kb-accent disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="w-full py-2.5 bg-kb-accent text-kb-white rounded-lg text-sm font-medium hover:bg-kb-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
