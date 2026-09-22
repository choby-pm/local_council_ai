"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Scale,
  Landmark,
  Wallet,
  FileText,
  User,
  History,
  Bookmark,
  ShieldCheck,
  ClipboardCheck,
  Users,
  Server,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Member } from "@/lib/member";

const mainNav = [
  { title: "대시보드", url: "/", icon: LayoutDashboard },
  { title: "법령·조례 검색", url: "/laws", icon: Scale },
  { title: "회의·안건", url: "/meetings", icon: Landmark },
  { title: "예산·결산", url: "/budget", icon: Wallet },
  { title: "의정활동 보고서", url: "/reports", icon: FileText },
];

const myPageNav = [
  { title: "계정·소속 정보", url: "/mypage/account", icon: User },
  { title: "활동이력 관리", url: "/mypage/history", icon: History },
  { title: "저장한 자료함", url: "/mypage/saved", icon: Bookmark },
];

const adminNav = [
  { title: "가입 승인 대기열", url: "/admin/approvals", icon: ClipboardCheck },
  { title: "계정 관리", url: "/admin/accounts", icon: Users },
  { title: "배치 모니터링", url: "/admin/batches", icon: Server },
  { title: "오류·재처리 큐", url: "/admin/errors", icon: AlertTriangle },
];

export function AppSidebar({ member }: { member: Member }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Landmark className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">지방의회 AI비서</span>
                  <span className="text-xs text-muted-foreground">
                    {member.council} · {member.committee}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>업무</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {member.role === "master" && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              관리자 콘솔
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                관리자 전용
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/mypage")}>
              <Link href="/mypage/account">
                <User />
                <span>마이페이지</span>
                <ChevronRight className="ml-auto size-4" />
              </Link>
            </SidebarMenuButton>
            <SidebarMenuSub>
              {myPageNav.map((item) => (
                <SidebarMenuSubItem key={item.url}>
                  <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
