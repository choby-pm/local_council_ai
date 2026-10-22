import { ShieldAlert } from "lucide-react";

export function AnswerUnavailable({ relatedLinkLabel, description }: { relatedLinkLabel?: string; description?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-medium text-amber-900 dark:text-amber-300">
          충분한 근거를 찾지 못해 답변을 제공하지 않습니다
        </p>
        <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-400/80">
          {description || "확인한 원문에서 답변을 뒷받침할 근거를 확보하지 못했습니다."}
          {relatedLinkLabel ? ` 아래 ${relatedLinkLabel} 원문을 직접 확인해주세요.` : ""}
        </p>
      </div>
    </div>
  );
}
