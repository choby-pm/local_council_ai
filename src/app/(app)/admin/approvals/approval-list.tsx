"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { approveMember, rejectMember } from "./actions";

export type PendingMember = {
  id: string;
  name: string;
  username: string | null;
  council: string;
  appliedAt: string;
};

export type ProcessedMember = {
  id: string;
  name: string;
  username: string | null;
  status: "active" | "rejected";
  rejectedReason: string | null;
  at: string;
};

export function ApprovalList({ pending, processed }: { pending: PendingMember[]; processed: ProcessedMember[] }) {
  const [rejectTarget, setRejectTarget] = useState<PendingMember | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function approve(p: PendingMember) {
    setBusyId(p.id);
    startTransition(async () => {
      const result = await approveMember(p.id);
      setBusyId(null);
      if (result.ok) toast.success(`${p.name}님 가입을 승인했습니다`);
      else toast.error(result.error);
    });
  }

  function reject() {
    const target = rejectTarget;
    if (!target) return;
    setBusyId(target.id);
    startTransition(async () => {
      const result = await rejectMember(target.id, reason);
      setBusyId(null);
      if (result.ok) {
        toast.success(`${target.name}님 가입을 거부했습니다`);
        setRejectTarget(null);
        setReason("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">승인 대기 {pending.length}건</CardTitle>
          <CardDescription>
            신청자가 실제 의원인지 확인한 뒤 승인해주세요. 승인하면 바로 이용할 수 있고, 거부 시 사유가 신청자에게 안내됩니다.
          </CardDescription>
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
                    <TableHead>아이디</TableHead>
                    <TableHead>소속 의회</TableHead>
                    <TableHead>신청일</TableHead>
                    <TableHead className="text-right">처리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.username ?? "—"}</TableCell>
                      <TableCell>{p.council}</TableCell>
                      <TableCell className="text-muted-foreground">{p.appliedAt}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="text-emerald-600"
                            onClick={() => approve(p)}
                            disabled={busyId === p.id}
                          >
                            <Check className="size-3.5" />
                            <span className="sr-only">승인</span>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setRejectTarget(p)}
                            disabled={busyId === p.id}
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
            <CardTitle className="text-base">최근 처리한 신청</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {processed.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {p.name}
                  <span className="text-muted-foreground"> · {p.username ?? "—"} · {p.at}</span>
                  {p.rejectedReason && <span className="block text-xs text-muted-foreground">사유: {p.rejectedReason}</span>}
                </span>
                <Badge variant={p.status === "active" ? "secondary" : "outline"} className="shrink-0 font-normal">
                  {p.status === "active" ? "승인됨" : "거부됨"}
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
              placeholder="예: 소속 의회 의원 명단에서 확인되지 않습니다"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={reject} disabled={!reason.trim() || busyId === rejectTarget?.id}>
              거부 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
