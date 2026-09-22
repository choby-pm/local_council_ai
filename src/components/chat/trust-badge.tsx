import { cn } from "@/lib/utils";

type TrustLevel = "high" | "medium" | "low";

const config: Record<TrustLevel, { label: string; className: string }> = {
  high: {
    label: "신뢰도 높음",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
  },
  medium: {
    label: "신뢰도 보통",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  },
  low: {
    label: "신뢰도 낮음 · 근거 제한적",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
  },
};

export function TrustBadge({ level }: { level: TrustLevel }) {
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        c.className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}

export type { TrustLevel };
