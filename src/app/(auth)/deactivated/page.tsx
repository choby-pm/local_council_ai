import { redirect } from "next/navigation";
import { Ban } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/member";

export default async function DeactivatedPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.status !== "disabled") redirect("/");

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
          <Ban className="size-6 text-muted-foreground" />
        </div>
        <CardTitle>비활성화된 계정입니다</CardTitle>
        <CardDescription>관리자에 의해 계정 이용이 제한되었습니다</CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>사유가 궁금하시거나 재활성화를 원하시면 관리자에게 문의해주세요.</p>
        <p className="mt-4 text-xs">문의: 소속 의회 사무처 또는 시스템 관리자</p>
      </CardContent>
    </Card>
  );
}
