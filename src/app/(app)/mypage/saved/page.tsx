"use client";

import { useState } from "react";
import { Bookmark, FileText, Landmark, Scale, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";

const typeMeta = {
  law: { label: "법령·조례", icon: Scale },
  meeting: { label: "회의·안건", icon: Landmark },
  budget: { label: "예산·결산", icon: Wallet },
  report: { label: "의정보고서", icon: FileText },
} as const;

type SavedItem = {
  id: string;
  type: keyof typeof typeMeta;
  title: string;
  meta: string;
};

const initialSaved: SavedItem[] = [
  {
    id: "s1",
    type: "law",
    title: "OO시 주민참여 기본 조례 제12조",
    meta: "전국 유사조례 비교표 · 2026-09-15 저장",
  },
  {
    id: "s2",
    type: "budget",
    title: "건설교통국 노후 교량 정밀점검 예산 증감표",
    meta: "2026년 3회 추경 · 2026-09-14 저장",
  },
  {
    id: "s3",
    type: "meeting",
    title: "재난안전관리 조례 질의응답 요지",
    meta: "제314회 정례회 본회의 · 2026-09-10 저장",
  },
];

export default function MyPageSavedPage() {
  const [saved, setSaved] = useState(initialSaved);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">저장한 자료함</h1>
        <p className="text-sm text-muted-foreground">
          법령·조례·회의·안건·예산 검색 결과 중 저장(북마크)한 자료입니다.
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Bookmark className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">저장한 자료가 없습니다</p>
          <p className="text-xs text-muted-foreground">
            법령·조례·회의·안건·예산 검색 결과에서 저장 버튼을 눌러보세요.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {saved.map((item) => {
              const meta = typeMeta[item.type];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                  <Badge variant="secondary" className="hidden shrink-0 font-normal sm:inline-flex">
                    {meta.label}
                  </Badge>
                  <ConfirmDeleteButton
                    title="저장 자료 삭제"
                    description={`"${item.title}" 자료를 저장 목록에서 삭제하시겠습니까?`}
                    onConfirm={() => setSaved((prev) => prev.filter((s) => s.id !== item.id))}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
