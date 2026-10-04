import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentMember } from "@/lib/member";
import { MemberProvider } from "@/lib/member-context";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const member = await getCurrentMember();
  // 쿠키는 있으나 만료·삭제된 세션 포함
  if (!member) redirect("/login");

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
