import type { ReactNode } from "react";
import { Sparkles, UserRound } from "lucide-react";

import { FeedbackButtons } from "@/components/chat/feedback-buttons";
import { MessageExport, type ExportSource } from "@/components/chat/message-export";
import { TrustBadge, type TrustLevel } from "@/components/chat/trust-badge";
import { cn } from "@/lib/utils";

export function UserMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
        {children}
      </div>
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
        <UserRound className="size-3.5" />
      </div>
    </div>
  );
}

export function AssistantMessage({
  trust,
  children,
  footer,
  className,
  exportable,
  messageId,
}: {
  trust?: TrustLevel;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  // 복사·문서로 받기에 쓸 원문과 출처 (일반 답변에만)
  exportable?: { text: string; sources: ExportSource[] };
  messageId?: string;
}) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3.5" />
      </div>
      <div className={cn("flex max-w-[90%] flex-col gap-2", className)}>
        {trust && <TrustBadge level={trust} sourceCount={exportable?.sources.length} />}
        <div className="rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 text-sm leading-relaxed">
          {children}
        </div>
        {footer}
        <div className="flex items-center justify-between">
          <FeedbackButtons messageId={messageId} />
          {exportable && <MessageExport text={exportable.text} sources={exportable.sources} />}
        </div>
      </div>
    </div>
  );
}
