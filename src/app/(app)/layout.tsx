import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentMember } from "@/lib/member";
import { MemberProvider } from "@/lib/member-context";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/utils";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const member = await getCurrentMember();
  // 쿠키는 있으나 만료·삭제된 세션 포함
  if (!member) redirect("/login");

  if (member.status === "pending") redirect("/pending-approval");
  if (member.status === "rejected") redirect("/rejected");
  if (member.status === "disabled") redirect("/deactivated");
  if (!member.onboardedAt) redirect("/onboarding/confirm");

  const [recentNotifications, unreadCount] = await Promise.all([
    getNotifications(member, 5),
    getUnreadNotificationCount(member),
  ]);
  // 관리자에게만 사이드바 "가입 승인"에 대기 건수를 표시
  const pendingApprovals =
    member.role === "master"
      ? (await getDb().select({ n: count() }).from(members).where(eq(members.status, "pending")))[0].n
      : 0;
  const now = new Date();

  return (
    <MemberProvider member={member}>
      <SidebarProvider>
        <AppSidebar member={member} pendingApprovals={pendingApprovals} />
        <SidebarInset>
          <AppHeader
            member={member}
            unreadCount={unreadCount}
            notifications={recentNotifications.map((n) => ({
              id: n.id,
              title: n.title,
              description: n.description,
              href: n.href,
              unread: n.unread,
              time: formatRelativeTime(n.createdAt, now),
            }))}
          />
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </MemberProvider>
  );
}
