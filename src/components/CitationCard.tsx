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
    <div className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
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
            <div key={i} className="text-xs text-gray-600">
              <p className="line-clamp-4 bg-white rounded p-2 border border-gray-100">
                {src.content}
              </p>
              {src.location && (
                <p className="mt-1 text-gray-400 truncate">
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
