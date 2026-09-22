import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";

import type { CitationSource } from "@/components/chat/render-citations";

export function SourceList({ sources }: { sources: CitationSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">출처 {sources.length}건</p>
      <ul className="flex flex-col gap-1">
        {sources.map((s) => {
          const href = s.sourceUrl || `/documents/${s.documentId}`;
          return (
            <li key={s.index}>
              <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-muted"
              >
                <FileText className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="mr-1 text-muted-foreground">[{s.index}]</span>
                  <span className="font-medium">{s.title}</span>
                  <span className="ml-1.5 text-muted-foreground">{s.meta}</span>
                </span>
                {s.sourceUrl && <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
