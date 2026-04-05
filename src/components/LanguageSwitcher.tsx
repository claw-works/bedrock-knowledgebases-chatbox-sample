"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

const LABELS: Record<string, string> = {
  en: "EN",
  "zh-CN": "中",
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === "en" ? "zh-CN" : "en";
    // next-intl with localePrefix:'never' stores locale in a cookie;
    // reload the same path after setting it via the intl cookie approach.
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title="Switch language / 切换语言"
      aria-label="Toggle language"
      className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold text-kb-text-muted hover:text-kb-text-primary hover:bg-kb-bg-input transition-colors disabled:opacity-50"
    >
      {LABELS[locale] ?? locale}
    </button>
  );
}
