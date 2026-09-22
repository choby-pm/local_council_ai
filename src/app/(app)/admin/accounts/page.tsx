"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Account = {
  id: string;
  name: string;
  council: string;
  councilKey: "a" | "b";
  committee: string;
  status: "활성" | "비활성화";
};

const initialAccounts: Account[] = [
  { id: "a1", name: "홍길동", council: "OO광역시의회", councilKey: "a", committee: "행정안전위원회", status: "활성" },
  { id: "a2", name: "김민준", council: "OO광역시의회", councilKey: "a", committee: "복지환경위원회", status: "활성" },
  { id: "a3", name: "이서연", council: "△△시의회", councilKey: "b", committee: "예산결산특별위원회", status: "활성" },
  { id: "a4", name: "최OO", council: "OO광역시의회", councilKey: "a", committee: "행정안전위원회", status: "비활성화" },
];

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [councilFilter, setCouncilFilter] = useState("all-council");
  const [statusFilter, setStatusFilter] = useState("all-status");

  const filtered = useMemo(
    () =>
      accounts.filter((a) => {
        if (councilFilter !== "all-council" && a.councilKey !== councilFilter) return false;
        if (statusFilter === "active" && a.status !== "활성") return false;
        if (statusFilter === "inactive" && a.status !== "비활성화") return false;
        return true;
      }),
    [accounts, councilFilter, statusFilter]
  );

  function toggleStatus(id: string) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === "활성" ? "비활성화" : "활성" } : a))
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">계정 관리</h1>
          <p className="text-sm text-muted-foreground">관리자 전용 — 의회별/권한별 계정 목록</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={councilFilter} onValueChange={setCouncilFilter}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="소속 의회" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-council">전체 의회</SelectItem>
            <SelectItem value="a">OO광역시의회</SelectItem>
            <SelectItem value="b">△△시의회</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">전체 상태</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="inactive">비활성화</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 {filtered.length}건</CardTitle>
          <CardDescription>의회별 데이터 분리 원칙에 따라 관리자도 소속 외 데이터는 접근할 수 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 계정이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>소속 의회</TableHead>
                    <TableHead>상임위</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">처리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.council}</TableCell>
                      <TableCell className="text-muted-foreground">{a.committee}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "활성" ? "secondary" : "outline"} className="font-normal">
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(a.id)}>
                          {a.status === "활성" ? "비활성화" : "재활성화"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
