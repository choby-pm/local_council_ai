"use client";

import { useState, useTransition } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { linkCouncilMember } from "./actions";

export type RosterItem = {
  id: string;
  name: string;
  district: string | null;
  committees: string[];
};

export function CouncilMemberPicker({
  roster,
  linkedId,
}: {
  roster: RosterItem[];
  linkedId: string | null;
}) {
  const [selected, setSelected] = useState<string>(linkedId ?? "");
  const [pending, startTransition] = useTransition();

  function save(id: string | null) {
    startTransition(async () => {
      const result = await linkCouncilMember(id);
      if (result.ok) {
        toast.success(id ? "의원 정보가 연결됐습니다" : "연결을 해제했습니다");
        if (!id) setSelected("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selected} onValueChange={setSelected} disabled={pending}>
          <SelectTrigger className="w-full sm:flex-1">
            <SelectValue placeholder="의원 명단에서 본인을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {roster.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
                <span className="text-muted-foreground">
                  {" "}
                  · {[m.district, ...m.committees].filter(Boolean).join(" · ")}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => save(selected)} disabled={pending || !selected || selected === linkedId}>
          {pending ? "저장 중…" : "연결"}
        </Button>
        {linkedId && (
          <Button variant="outline" onClick={() => save(null)} disabled={pending}>
            연결 해제
          </Button>
        )}
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        연결하면 소속 위원회·선거구가 자동으로 채워지고, 비서가 의원님 위원회의 감사 대상 부서와 지역구에 맞춰 준비합니다.
        본인 확인 절차는 이후 추가될 예정입니다.
      </p>
    </div>
  );
}
