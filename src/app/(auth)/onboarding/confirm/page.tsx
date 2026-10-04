import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/member";

import { markOnboarded } from "../actions";

export default async function OnboardingConfirmPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.status === "pending") redirect("/pending-approval");
  if (member.status === "rejected") redirect("/rejected");
  if (member.status === "disabled") redirect("/deactivated");
  if (member.onboardedAt) redirect("/");

  const fields = [
    { label: "소속 의회", value: member.council },
    { label: "소속 상임위", value: member.committee ?? "미지정" },
    { label: "지역구·비례", value: member.district ?? "미지정" },
  ];

  async function confirm() {
    "use server";
    await markOnboarded();
    redirect("/onboarding/activity-intro");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>가입 정보를 확인해주세요</CardTitle>
        <CardDescription>최초 로그인 시 1회만 확인합니다. 오타가 있다면 관리자에게 문의해주세요.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col divide-y rounded-md border">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                {f.value}
              </span>
            </div>
          ))}
        </div>
        <form action={confirm}>
          <Button type="submit" className="w-full">
            맞습니다, 계속하기
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
