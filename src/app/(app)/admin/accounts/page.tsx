import { desc } from "drizzle-orm";
import { Users } from "lucide-react";

import { getDb } from "@/db";
import { members } from "@/db/schema";
import { getActiveMember } from "@/lib/member";

import { AccountList } from "./account-list";

// 관리자 권한 검사는 admin/layout.tsx에서, 처리 권한은 각 서버 액션에서 다시 확인한다
export default async function AdminAccountsPage() {
  const actor = await getActiveMember();
  const rows = await getDb()
    .select({
      id: members.id,
      name: members.name,
      username: members.username,
      committee: members.committee,
      role: members.role,
      status: members.status,
      createdAt: members.createdAt,
    })
    .from(members)
    .orderBy(desc(members.createdAt));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">계정 관리</h1>
          <p className="text-sm text-muted-foreground">관리자 전용 — 의원 계정을 비활성화·삭제하거나 관리자 권한을 조정합니다</p>
        </div>
      </div>

      <AccountList
        accounts={rows.map((r) => ({
          id: r.id,
          name: r.name,
          username: r.username,
          committee: r.committee,
          role: r.role,
          status: r.status,
          createdAt: r.createdAt.toISOString().slice(0, 10),
          isSelf: r.id === actor?.id,
        }))}
      />
    </div>
  );
}
