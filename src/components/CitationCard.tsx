"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

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
    <div className="rounded-lg border border-kb-border bg-kb-bg-input overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-kb-text-secondary hover:bg-kb-bg-secondary transition-colors"
      >
        <span className="font-medium flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-kb-accent" />
          {citation.sources[0]?.title ??
            citation.sources[0]?.location ??
            `Source ${index}`}
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {citation.sources.map((src, i) => (
            <div key={i} className="text-xs text-kb-text-muted">
              <p className="line-clamp-4 bg-kb-bg-primary rounded p-2 border border-kb-border">
                {src.content}
              </p>
              {src.location && (
                <p className="mt-1 text-kb-text-muted truncate">
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
