"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";

const autoLogged = [
  { title: "본회의 발언 — 재난안전 통신망 예산 질의", date: "2026-08-22", type: "발언" },
  { title: "「주민참여 기본 조례 일부개정조례안」 대표발의", date: "2026-08-05", type: "조례발의" },
];

type ManualEntry = { id: string; title: string; date: string; type: string };

const initialManual: ManualEntry[] = [
  { id: "m1", title: "지역 주민 간담회 — 청년 주거정책 의견수렴", date: "2026-08-14", type: "민원·현장" },
];

const typeLabel: Record<string, string> = {
  civil: "민원·현장",
  meeting: "간담회·토론회",
  etc: "기타",
};

export default function MyPageHistoryPage() {
  const [manual, setManual] = useState(initialManual);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: "civil", title: "", date: "", desc: "" });

  function handleAdd() {
    if (!form.title.trim()) return;
    setManual((prev) => [
      { id: crypto.randomUUID(), title: form.title, date: form.date || "날짜 미입력", type: typeLabel[form.type] },
      ...prev,
    ]);
    setForm({ type: "civil", title: "", date: "", desc: "" });
    setDialogOpen(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">활동이력 관리</h1>
          <p className="text-sm text-muted-foreground">
            자동으로 수집되지 않는 활동(민원 처리, 현장방문 등)을 직접 등록합니다.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="size-4" />
              이력 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>활동이력 추가</DialogTitle>
              <DialogDescription>
                의정활동 보고서 초안 생성 시 함께 반영됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hist-type">구분</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger id="hist-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">민원·현장</SelectItem>
                    <SelectItem value="meeting">간담회·토론회</SelectItem>
                    <SelectItem value="etc">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hist-title">제목</Label>
                <Input
                  id="hist-title"
                  placeholder="예: 지역 주민 간담회 — 청년 주거정책"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hist-date">날짜</Label>
                <Input
                  id="hist-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hist-desc">설명</Label>
                <Textarea
                  id="hist-desc"
                  placeholder="활동 내용을 간단히 적어주세요"
                  value={form.desc}
                  onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!form.title.trim()}>
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!bannerDismissed && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-4 py-3">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-xs text-muted-foreground">
            활동이력이 더 많이 쌓일수록 의정활동 보고서 초안 품질이 좋아집니다. 지금 몇 건만
            추가해보세요.
          </p>
          <Button variant="ghost" size="icon-sm" onClick={() => setBannerDismissed(true)}>
            <X className="size-3.5" />
            <span className="sr-only">닫기</span>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">자동 수집된 활동</CardTitle>
          <CardDescription>①~⑤ 기능 이용 로그에서 자동으로 채워집니다</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {autoLogged.map((item) => (
            <div key={item.title} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.date}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {item.type}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">수동 등록한 활동</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {manual.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              등록된 수동 이력이 없습니다
            </p>
          )}
          {manual.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  {item.type}
                </Badge>
                <ConfirmDeleteButton
                  title="활동이력 삭제"
                  description={`"${item.title}" 항목을 삭제하시겠습니까?`}
                  onConfirm={() => setManual((prev) => prev.filter((m) => m.id !== item.id))}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
