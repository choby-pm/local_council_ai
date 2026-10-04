import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/member";

import { logout } from "../actions";

export default async function RejectedPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.status !== "rejected") redirect("/");

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <XCircle className="size-6 text-red-600 dark:text-red-400" />
        </div>
        <CardTitle>가입이 거부되었습니다</CardTitle>
        <CardDescription>관리자가 아래 사유로 가입 신청을 거부했습니다</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {member.rejectedReason || "사유가 등록되지 않았습니다. 관리자에게 문의해주세요."}
        </p>
        <form action={logout} className="w-full">
          <Button type="submit" variant="outline" className="w-full">
            로그아웃
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
