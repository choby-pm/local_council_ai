import Link from "next/link";
import { Landmark } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4 sm:p-6">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Landmark className="size-4" />
        </div>
        <span className="font-semibold">지방의회 AI비서</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
