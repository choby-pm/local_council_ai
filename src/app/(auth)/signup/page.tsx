import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { getCurrentMember } from "@/lib/member";

import { CompleteProfileForm } from "./complete-profile-form";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const member = await getCurrentMember();
  if (member) {
    if (member.status === "pending") redirect("/pending-approval");
    if (member.status === "rejected") redirect("/rejected");
    if (member.status === "disabled") redirect("/deactivated");
    if (!member.onboardedAt) redirect("/onboarding/confirm");
    redirect("/");
  }

  // Clerk 세션은 있는데(이메일 인증까지 완료) 우리 DB에 프로필이 없는 상태 —
  // 처음부터 다시 가입시키지 않고 소속 정보만 마저 받는다.
  const { userId } = await auth();
  if (userId) {
    return <CompleteProfileForm />;
  }

  return <SignupForm />;
}
