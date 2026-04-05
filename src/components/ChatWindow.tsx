"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";
import MessageBubble, { Message } from "./MessageBubble";
import { getStoredApiKey } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export interface ChatWindowProps {
  externalSessionId?: string | null;
  externalMessages?: Message[];
  userId?: string;
  kbId?: string;
  onFirstMessage?: (sessionId: string, preview: string) => void;
}

export default function ChatWindow({
  externalSessionId,
  externalMessages,
  userId,
  kbId,
  onFirstMessage,
}: ChatWindowProps = {}) {
  const t = useTranslations("chat");
  const searchParams = useSearchParams();
  const resolvedKbId = kbId ?? searchParams.get("kbId") ?? undefined;
  const resolvedUserId = userId ?? searchParams.get("userId") ?? undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (externalSessionId && externalMessages) {
      setSessionId(externalSessionId);
      // Filter out empty assistant messages (stale "Thinking" from previous errors)
      setMessages(
        externalMessages.filter(
          (m) => !(m.role === "assistant" && !m.content)
        )
      );
    }
  }, [externalSessionId, externalMessages]);

  // Auto-resize textarea
  const adjustHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const streamResponse = useCallback(async (query: string, assistantId: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const apiKey = getStoredApiKey() ?? process.env.NEXT_PUBLIC_API_KEY;
      if (apiKey) headers["x-api-key"] = apiKey;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ query, sessionId, kbId: resolvedKbId, userId: resolvedUserId }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.content }
                    : m
                )
              );
            } else if (data.type === "citation") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, citations: [...(m.citations ?? []), ...data.citations] }
                    : m
                )
              );
            } else if (data.type === "session" && data.sessionId) {
              setSessionId(data.sessionId);
            } else if (data.type === "error" && data.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `⚠️ ${data.error}`, isStreaming: false }
                    : m
                )
              );
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `⚠️ ${t("error")}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [sessionId, resolvedKbId, resolvedUserId, t]);

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || isStreaming) return;

    const isFirst = messages.length === 0;

    setInput("");
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsStreaming(true);

    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: query,
      citations: [],
    };
    setMessages((prev) => [...prev, userMsg]);

    // Notify parent to add topic in sidebar immediately
    if (isFirst && onFirstMessage) {
      onFirstMessage(sessionId, query.slice(0, 60));
    }

    const assistantId = uuidv4();
    setMessages((prev) => [...prev, {
      id: assistantId,
      role: "assistant",
      content: "",
      citations: [],
      isStreaming: true,
    }]);

    await streamResponse(query, assistantId);
  };

  const handleRegenerate = useCallback(async (assistantMsgId: string) => {
    if (isStreaming) return;

    const idx = messages.findIndex((m) => m.id === assistantMsgId);
    if (idx < 1) return;
    const userMsg = messages[idx - 1];
    if (userMsg.role !== "user") return;

    setIsStreaming(true);

    const newId = uuidv4();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId
          ? { id: newId, role: "assistant", content: "", citations: [], isStreaming: true }
          : m
      )
    );

    await streamResponse(userMsg.content, newId);
  }, [isStreaming, messages, streamResponse]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !composingRef.current) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-kb-text-muted mt-20">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-lg">{t("emptyState")}</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onRegenerate={handleRegenerate} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-8 pt-4 pb-6 space-y-3">
        <div className="flex items-end gap-2 rounded-xl bg-kb-bg-input border-[1.5px] border-kb-border-focus pl-4 pr-1.5 py-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            placeholder={t("placeholder")}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-kb-text-primary placeholder-kb-text-muted focus:outline-none py-2 max-h-40"
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="w-10 h-10 rounded-lg bg-kb-accent flex items-center justify-center hover:bg-kb-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <ArrowUp className="w-[18px] h-[18px] text-kb-white" />
          </button>
        </div>
        <p className="text-[11px] text-kb-text-muted text-center">
          Bedrock KB 基于你的知识库文档回答问题，回答可能不完全准确，请注意核实。
        </p>
      </div>
    </div>
  );
}
