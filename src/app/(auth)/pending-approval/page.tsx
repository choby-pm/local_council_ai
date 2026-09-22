import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/member";
import { daysSince } from "@/lib/utils";

export default async function PendingApprovalPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.status === "active") redirect("/");
  if (member.status === "rejected") redirect("/rejected");
  if (member.status === "disabled") redirect("/deactivated");

  const daysWaiting = daysSince(member.createdAt);

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
          <Clock3 className="size-6 text-amber-600 dark:text-amber-400" />
        </div>
        <CardTitle>승인 대기중</CardTitle>
        <CardDescription>
          가입 신청이 접수되었습니다. 마스터 계정 승인 후 이용하실 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>
          신청일: {member.createdAt.toISOString().slice(0, 10)} · 대기 {daysWaiting}일 경과
        </p>
        <p className="mt-1">통상 1~2 영업일 내 처리됩니다</p>
        <p className="mt-4 text-xs">문의: 소속 의회 사무처 또는 시스템 관리자</p>
      </CardContent>
    </Card>
  );
}
