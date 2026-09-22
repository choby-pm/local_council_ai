"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Member } from "@/lib/member";

const MemberContext = createContext<Member | null>(null);

export function MemberProvider({ member, children }: { member: Member; children: ReactNode }) {
  return <MemberContext.Provider value={member}>{children}</MemberContext.Provider>;
}

export function useMember(): Member {
  const member = useContext(MemberContext);
  if (!member) throw new Error("useMember은 MemberProvider 안에서만 사용할 수 있습니다");
  return member;
}
