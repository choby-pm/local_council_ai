"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Landmark,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  User,
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
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Member } from "@/lib/member";

// 법령·조례와 회의·안건은 같은 에이전트가 도구를 골라 답하므로 "AI 비서" 하나로 합쳤다.
// 동작하지 않던 목업 메뉴(예산·결산, 의정활동 보고서, 활동이력, 저장한 자료함, 관리자 콘솔 일부)는 제거.
// AI 비서가 중심 화면이고, 행정사무감사 질의 후보는 비서의 추천 질문으로 들어갔다 (결정 D-25)
const mainNav = [
  { title: "AI 비서", url: "/assistant", icon: MessageSquareText },
  { title: "대시보드", url: "/", icon: LayoutDashboard },
];

const adminNav = [{ title: "가입 승인", url: "/admin/approvals", icon: ClipboardCheck }];

function NavItem({ item, active }: { item: (typeof mainNav)[number]; active: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
        <Link href={item.url}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ member }: { member: Member }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/assistant">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Landmark className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">지방의회 AI비서</span>
                  <span className="text-xs text-muted-foreground">
                    {[member.council, member.committee].filter(Boolean).join(" · ")}
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
                  <NavItem key={item.url} item={item} active={pathname === item.url} />
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
