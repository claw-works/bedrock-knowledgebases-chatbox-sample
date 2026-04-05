"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import { Bot, Copy, Check, RefreshCw } from "lucide-react";
import CitationCard, { Citation } from "./CitationCard";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
}

export default function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const t = useTranslations("chat");
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end w-full">
        <div className="max-w-[420px] rounded-[16px_16px_4px_16px] bg-kb-bg-msg-user px-4 py-3 space-y-1">
          <p className="text-sm text-kb-white leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 w-full">
      <div className="w-8 h-8 rounded-full bg-kb-accent flex items-center justify-center shrink-0">
        <Bot className="w-[18px] h-[18px] text-kb-white" />
      </div>

      <div className="flex-1 min-w-0 rounded-[16px_16px_16px_4px] bg-kb-bg-msg-ai border border-kb-border px-4 py-3 space-y-3">
        <div
          className={`prose prose-sm max-w-none text-sm leading-relaxed ${message.isStreaming ? "typing-cursor" : ""
            }`}
        >
          {message.content ? (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          ) : (
            <span className="text-kb-text-muted italic">{t("thinking")}</span>
          )}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-kb-text-muted">📚 引用来源</p>
            <div className="space-y-2">
              {message.citations.map((c, i) => (
                <CitationCard key={i} citation={c} index={i + 1} />
              ))}
            </div>
          </div>
        )}

        {!message.isStreaming && message.content && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-kb-text-muted hover:text-kb-text-secondary transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="flex items-center gap-1 text-kb-text-muted hover:text-kb-text-secondary transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
