import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Source = {
  label: string;
  documentId?: string;
  sourceUrl?: string | null;
  title: string;
  excerpt: string;
  meta: string;
};

export function SourceCitation({ index, source }: { index: number; source: Source }) {
  // 원문이 있는 외부(의회 홈페이지 등) URL이 있으면 그쪽으로, 없으면 내부 원문 뷰어로
  const href = source.sourceUrl || (source.documentId ? `/documents/${source.documentId}` : null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 translate-y-[-3px] items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground hover:bg-primary hover:text-primary-foreground"
        >
          {index}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" side="top">
        <p className="font-medium">{source.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{source.meta}</p>
        <p className="mt-2 rounded bg-muted p-2 text-xs leading-relaxed">{source.excerpt}</p>
        {href && (
          <Button asChild variant="outline" size="sm" className="mt-2 w-full gap-1.5">
            <Link href={href} target="_blank" rel="noopener noreferrer">
              원문 보기
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
