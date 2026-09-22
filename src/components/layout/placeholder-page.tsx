import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-24 text-center">
        <Construction className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">다음 검수 라운드에서 구현 예정인 화면입니다</p>
        <p className="text-xs text-muted-foreground">
          현재는 네비게이션 골격 확인용 자리표시자입니다.
        </p>
      </div>
    </div>
  );
}
