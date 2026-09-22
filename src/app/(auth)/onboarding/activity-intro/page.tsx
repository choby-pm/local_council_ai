import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OnboardingActivityIntroPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-6 text-primary" />
        </div>
        <CardTitle>지난 의정활동을 미리 입력해보세요</CardTitle>
        <CardDescription>
          활동이력이 쌓일수록 의정활동 보고서 초안의 품질이 좋아집니다. 지금 입력하지 않아도
          나중에 마이페이지에서 언제든 추가할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/mypage/history">지금 입력하기</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/">나중에 하기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
