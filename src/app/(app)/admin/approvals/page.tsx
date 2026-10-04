import { asc, desc, eq, inArray } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";

import { getDb } from "@/db";
import { members } from "@/db/schema";

import { ApprovalList } from "./approval-list";

// 관리자 권한 검사는 admin/layout.tsx에서, 처리 권한은 각 서버 액션에서 다시 확인한다
export default async function AdminApprovalsPage() {
  const db = getDb();
  const columns = {
    id: members.id,
    name: members.name,
    username: members.username,
    council: members.council,
    status: members.status,
    rejectedReason: members.rejectedReason,
    createdAt: members.createdAt,
    approvedAt: members.approvedAt,
  };

  const [pending, processed] = await Promise.all([
    db.select(columns).from(members).where(eq(members.status, "pending")).orderBy(asc(members.createdAt)),
    db
      .select(columns)
      .from(members)
      .where(inArray(members.status, ["active", "rejected"]))
      .orderBy(desc(members.createdAt))
      .limit(10),
  ]);

  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">가입 승인 대기열</h1>
          <p className="text-sm text-muted-foreground">관리자 전용 — 가입 신청을 확인하고 승인하거나 거부합니다</p>
        </div>
      </div>

      <ApprovalList
        pending={pending.map((m) => ({
          id: m.id,
          name: m.name,
          username: m.username,
          council: m.council,
          appliedAt: day(m.createdAt),
        }))}
        processed={processed.map((m) => ({
          id: m.id,
          name: m.name,
          username: m.username,
          status: m.status as "active" | "rejected",
          rejectedReason: m.rejectedReason,
          at: day(m.approvedAt ?? m.createdAt),
        }))}
      />
    </div>
  );
}
