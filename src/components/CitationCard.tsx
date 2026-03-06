"use client";

import { useState } from "react";

export interface Citation {
  generatedText: string;
  sources: Array<{
    content: string;
    location?: string;
    title?: string;
  }>;
}

export default function CitationCard({
  citation,
  index,
}: {
  citation: Citation;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="font-medium flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
            {index}
          </span>
          {citation.sources[0]?.title ??
            citation.sources[0]?.location ??
            `Source ${index}`}
        </span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {citation.sources.map((src, i) => (
            <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
              <p className="line-clamp-4 bg-white dark:bg-gray-900 rounded p-2 border border-gray-100 dark:border-gray-700">
                {src.content}
              </p>
              {src.location && (
                <p className="mt-1 text-gray-400 dark:text-gray-500 truncate">
                  📄{" "}
                  {src.location.startsWith("s3://")
                    ? src.location.split("/").pop()
                    : src.location}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
