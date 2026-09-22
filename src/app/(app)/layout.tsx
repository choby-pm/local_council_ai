import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentMember } from "@/lib/member";
import { MemberProvider } from "@/lib/member-context";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const member = await getCurrentMember();
  // Clerk 세션은 있지만 members row가 없음 — 가입은 시작했지만 프로필 저장이 안 된 상태
  if (!member) redirect("/signup");

  if (member.status === "pending") redirect("/pending-approval");
  if (member.status === "rejected") redirect("/rejected");
  if (member.status === "disabled") redirect("/deactivated");
  if (!member.onboardedAt) redirect("/onboarding/confirm");

  return (
    <MemberProvider member={member}>
      <SidebarProvider>
        <AppSidebar member={member} />
        <SidebarInset>
          <AppHeader member={member} />
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </MemberProvider>
  );
}
