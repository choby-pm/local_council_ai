"use client";

import { useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Pending = {
  id: string;
  name: string;
  council: string;
  committee: string;
  district: string;
  appliedAt: string;
};

const initialPending: Pending[] = [
  { id: "p1", name: "김민준", council: "OO광역시의회", committee: "복지환경위원회", district: "3선거구", appliedAt: "2026-09-20" },
  { id: "p2", name: "이서연", council: "△△시의회", committee: "예산결산특별위원회", district: "비례대표", appliedAt: "2026-09-19" },
  { id: "p3", name: "박지훈", council: "OO광역시의회", committee: "행정안전위원회", district: "7선거구", appliedAt: "2026-09-18" },
];

export default function AdminApprovalsPage() {
  const [pending, setPending] = useState(initialPending);
  const [rejectTarget, setRejectTarget] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [processed, setProcessed] = useState<{ name: string; result: "승인" | "거부" }[]>([]);

  function approve(p: Pending) {
    setPending((prev) => prev.filter((x) => x.id !== p.id));
    setProcessed((prev) => [{ name: p.name, result: "승인" }, ...prev]);
  }

  function reject() {
    if (!rejectTarget) return;
    setPending((prev) => prev.filter((x) => x.id !== rejectTarget.id));
    setProcessed((prev) => [{ name: rejectTarget.name, result: "거부" }, ...prev]);
    setRejectTarget(null);
    setReason("");
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">가입 승인 대기열</h1>
          <p className="text-sm text-muted-foreground">관리자 전용 — 신규 가입 신청을 승인/거부합니다</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">승인 대기 {pending.length}건</CardTitle>
          <CardDescription>거부 시 사유 입력이 필요합니다</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">대기 중인 가입 신청이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>소속 의회</TableHead>
                    <TableHead>상임위</TableHead>
                    <TableHead>지역구</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead className="text-right">처리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.council}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {p.committee}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.district}</TableCell>
                      <TableCell className="text-muted-foreground">{p.appliedAt}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="text-emerald-600"
                            onClick={() => approve(p)}
                          >
                            <Check className="size-3.5" />
                            <span className="sr-only">승인</span>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setRejectTarget(p)}
                          >
                            <X className="size-3.5" />
                            <span className="sr-only">거부</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {processed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">방금 처리한 항목</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {processed.map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex items-center justify-between py-2 text-sm">
                <span>{p.name}</span>
                <Badge variant={p.result === "승인" ? "secondary" : "outline"} className="font-normal">
                  {p.result}됨
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectTarget?.name} 가입 거부</DialogTitle>
            <DialogDescription>거부 사유는 신청자에게 그대로 안내됩니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="reject-reason">거부 사유</Label>
            <Textarea
              id="reject-reason"
              placeholder="예: 소속 의회 정보가 확인되지 않습니다"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={reject} disabled={!reason.trim()}>
              거부 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
