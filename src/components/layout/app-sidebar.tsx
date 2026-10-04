"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Landmark,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  User,
  Users,
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
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { Member } from "@/lib/member";

// 법령·조례와 회의·안건은 같은 에이전트가 도구를 골라 답하므로 "AI 비서" 하나로 합쳤다.
// 동작하지 않던 목업 메뉴(예산·결산, 의정활동 보고서, 활동이력, 저장한 자료함, 관리자 콘솔 일부)는 제거.
// AI 비서가 중심 화면이고, 행정사무감사 질의 후보는 비서의 추천 질문으로 들어갔다 (결정 D-25)
const mainNav = [
  { title: "대시보드", url: "/", icon: LayoutDashboard },
  { title: "AI 비서", url: "/assistant", icon: MessageSquareText },
];

const adminNav = [
  { title: "가입 승인", url: "/admin/approvals", icon: ClipboardCheck },
  { title: "계정 관리", url: "/admin/accounts", icon: Users },
];

function NavItem({ item, active, badge = 0 }: { item: (typeof mainNav)[number]; active: boolean; badge?: number }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={badge > 0 ? `${item.title} (${badge})` : item.title}>
        <Link href={item.url} className="relative">
          <item.icon />
          <span>{item.title}</span>
          {/* 접힌 아이콘 모드에서는 숫자 배지가 숨겨지므로 점으로 표시 */}
          {badge > 0 && (
            <span className="absolute top-1 left-5 hidden size-2 rounded-full bg-destructive group-data-[collapsible=icon]:block" />
          )}
        </Link>
      </SidebarMenuButton>
      {badge > 0 && (
        <SidebarMenuBadge className="bg-destructive text-white peer-hover/menu-button:text-white peer-data-active/menu-button:text-white">
          {badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

// 로고 옆의 사이드바 접기·펼치기 버튼 (데스크톱). 모바일은 헤더의 버튼으로 연다
function CollapseToggle({ collapsed }: { collapsed: boolean }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      className="shrink-0 text-muted-foreground"
      title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
    >
      {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      <span className="sr-only">{collapsed ? "사이드바 펼치기" : "사이드바 접기"}</span>
    </Button>
  );
}

export function AppSidebar({ member, pendingApprovals = 0 }: { member: Member; pendingApprovals?: number }) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  // 아이콘만 보이는 접힌 상태에서는 로고와 버튼을 함께 둘 폭이 없어 펼치기 버튼만 보인다
  const collapsed = !isMobile && state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={collapsed ? "flex justify-center" : "flex items-center gap-1"}>
          {!collapsed && (
            <SidebarMenu className="min-w-0 flex-1">
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link href="/assistant">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Landmark className="size-4" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                      <span className="font-semibold">지방의회 AI비서</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[member.council, member.committee].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
          {!isMobile && <CollapseToggle collapsed={collapsed} />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>업무</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <NavItem key={item.url} item={item} active={pathname === item.url} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {member.role === "master" && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              관리자
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <NavItem
                    key={item.url}
                    item={item}
                    active={pathname === item.url}
                    badge={item.url === "/admin/approvals" ? pendingApprovals : 0}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <NavItem
            item={{ title: "마이페이지", url: "/mypage/account", icon: User }}
            active={pathname.startsWith("/mypage")}
          />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
