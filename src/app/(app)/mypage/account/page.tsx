import { Info } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const fields = [
  { label: "이름", value: "홍길동" },
  { label: "이메일", value: "hong.gd@council.go.kr" },
  { label: "소속 의회", value: "OO광역시의회" },
  { label: "소속 상임위", value: "행정안전위원회" },
  { label: "지역구·비례", value: "비례대표" },
  { label: "계정 상태", value: "활성" },
];

export default function MyPageAccountPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">계정·소속 정보</h1>
        <p className="text-sm text-muted-foreground">조회 전용 화면입니다.</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        소속 의회·상임위·지역구 등 정보 변경은 마스터 계정 승인이 필요합니다. 변경이 필요하면 관리자에게 문의해주세요.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
          <CardDescription>가입 시 등록된 정보입니다</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {fields.map((f, i) => (
            <div key={f.label} className={`flex items-center justify-between py-3 ${i === 0 ? "pt-0" : ""}`}>
              <Label className="text-muted-foreground">{f.label}</Label>
              <span className="text-sm font-medium">{f.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-muted-foreground">
        비밀번호 변경은 로그인 화면의 &quot;비밀번호 재설정&quot;을 이용해주세요.
      </p>
    </div>
  );
}
