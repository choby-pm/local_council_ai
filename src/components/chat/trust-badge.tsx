import { cn } from "@/lib/utils";

type TrustLevel = "high" | "medium" | "low";

export function TrustBadge({ level, sourceCount }: { level: TrustLevel; sourceCount?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        level === "low" ? "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "border-border bg-muted text-muted-foreground"
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {sourceCount != null ? `인용 근거 ${sourceCount}건 · 원문 확인 필요` : "근거 부족 · 원문 확인 필요"}
    </span>
  );
}

export type { TrustLevel };
