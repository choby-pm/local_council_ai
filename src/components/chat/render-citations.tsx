import { Fragment } from "react";

import { SourceCitation, type Source } from "@/components/chat/source-citation";

export type CitationSource = {
  index: number;
  documentId: string;
  sourceUrl: string | null;
  title: string;
  meta: string;
  excerpt: string;
};

export function renderWithCitations(text: string, sources: CitationSource[]) {
  if (sources.length === 0) return text;

  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return <Fragment key={i}>{part}</Fragment>;

    const source = sources.find((s) => s.index === Number(match[1]));
    if (!source) return <Fragment key={i}>{part}</Fragment>;

    const popoverSource: Source = {
      label: String(source.index),
      documentId: source.documentId,
      sourceUrl: source.sourceUrl,
      title: source.title,
      meta: source.meta,
      excerpt: source.excerpt,
    };
    return <SourceCitation key={i} index={source.index} source={popoverSource} />;
  });
}
