"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import CitationCard, { Citation } from "./CitationCard";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div
              className={`prose prose-sm dark:prose-invert max-w-none ${
                message.isStreaming && !message.content ? "typing-cursor" : ""
              } ${message.isStreaming && message.content ? "typing-cursor" : ""}`}
            >
              {message.content ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 italic">Thinking…</span>
              )}
            </div>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  Sources ({message.citations.length})
                </p>
                <div className="space-y-1">
                  {message.citations.map((c, i) => (
                    <CitationCard key={i} citation={c} index={i + 1} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
