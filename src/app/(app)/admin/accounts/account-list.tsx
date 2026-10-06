"use client";

import { useMemo, useState, useTransition } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { deleteAccount, resetPassword, setAccountActive, setAccountRole } from "./actions";

export type AccountRow = {
  id: string;
  name: string;
  username: string | null;
  committee: string | null;
  role: "member" | "master";
  status: "pending" | "active" | "rejected" | "disabled";
  createdAt: string;
  isSelf: boolean;
};

const statusMeta: Record<AccountRow["status"], { label: string; className: string }> = {
  active: { label: "활성", className: "border-emerald-300 text-emerald-700 dark:text-emerald-400" },
  disabled: { label: "비활성", className: "border-muted-foreground/30 text-muted-foreground" },
  pending: { label: "승인대기", className: "border-amber-300 text-amber-700 dark:text-amber-400" },
  rejected: { label: "거부됨", className: "border-red-300 text-red-700 dark:text-red-400" },
};

const filters: { value: "all" | AccountRow["status"]; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "disabled", label: "비활성" },
  { value: "pending", label: "승인대기" },
  { value: "rejected", label: "거부됨" },
];

export function AccountList({ accounts }: { accounts: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; username: string | null; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        (filter === "all" || a.status === filter) &&
        (!q || a.name.toLowerCase().includes(q) || (a.username ?? "").includes(q))
    );
  }, [accounts, query, filter]);

  function run(target: AccountRow, action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusyId(target.id);
    startTransition(async () => {
      const result = await action();
      setBusyId(null);
      if (result.ok) toast.success(success);
      else toast.error(result.error ?? "처리하지 못했습니다");
    });
  }

  function issueTempPassword(target: AccountRow) {
    setBusyId(target.id);
    startTransition(async () => {
      const result = await resetPassword(target.id);
      setBusyId(null);
      if (result.ok) setTempPassword({ name: target.name, username: target.username, password: result.tempPassword });
      else toast.error(result.error);
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 {accounts.length}개</CardTitle>
          <CardDescription>
            낙선·임기 종료 의원은 <strong>비활성화</strong>를 권합니다. 로그인만 막고 대화 기록은 보존하며, 재선되면 다시 켤 수 있습니다.
            삭제는 계정과 대화 기록을 영구히 지웁니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름·아이디 검색"
                className="h-9 pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {filters.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={filter === f.value ? "secondary" : "ghost"}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 계정이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>아이디</TableHead>
                    <TableHead>상임위</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((a) => (
                    <TableRow key={a.id} className={cn(a.status === "disabled" && "opacity-60")}>
                      <TableCell className="font-medium">
                        {a.name}
                        {a.role === "master" && (
                          <Badge variant="secondary" className="ml-1.5 font-normal">
                            관리자
                          </Badge>
                        )}
                        {a.isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(나)</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.username ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{a.committee ?? "미선택"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-normal", statusMeta[a.status].className)}>
                          {statusMeta[a.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.createdAt}</TableCell>
                      <TableCell>
                        {!a.isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon-sm" variant="ghost" disabled={busyId === a.id}>
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">계정 작업</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {a.status === "active" && (
                                <DropdownMenuItem
                                  onClick={() => run(a, () => setAccountActive(a.id, false), `${a.name} 계정을 비활성화했습니다`)}
                                >
                                  비활성화
                                </DropdownMenuItem>
                              )}
                              {a.status === "disabled" && (
                                <DropdownMenuItem
                                  onClick={() => run(a, () => setAccountActive(a.id, true), `${a.name} 계정을 다시 활성화했습니다`)}
                                >
                                  다시 활성화
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  run(
                                    a,
                                    () => setAccountRole(a.id, a.role !== "master"),
                                    a.role === "master" ? `${a.name} 관리자 권한을 해제했습니다` : `${a.name}님을 관리자로 지정했습니다`
                                  )
                                }
                              >
                                {a.role === "master" ? "관리자 해제" : "관리자로 지정"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => issueTempPassword(a)}>비밀번호 초기화</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(a)}>
                                계정 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tempPassword?.name} 임시 비밀번호</AlertDialogTitle>
            <AlertDialogDescription>
              이 창을 닫으면 다시 볼 수 없습니다. 의원에게 전달하고, 로그인 후 마이페이지에서 바로 바꾸도록 안내해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
            아이디 {tempPassword?.username ?? "—"} · 비밀번호 {tempPassword?.password}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (tempPassword) navigator.clipboard?.writeText(tempPassword.password).catch(() => {});
              }}
            >
              비밀번호 복사
            </AlertDialogCancel>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.name} 계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              계정과 대화 기록이 영구히 삭제되며 되돌릴 수 없습니다. 낙선·임기 종료라면 비활성화로 기록을 보존할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const target = deleteTarget;
                if (target) run(target, () => deleteAccount(target.id), `${target.name} 계정을 삭제했습니다`);
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
