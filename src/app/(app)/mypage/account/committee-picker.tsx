"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { setCommittee } from "./actions";

export function CommitteePicker({
  committees,
  current,
}: {
  committees: string[];
  current: string | null;
}) {
  const [selected, setSelected] = useState(current ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await setCommittee(selected);
      if (result.ok) toast.success(`소속 상임위를 ${selected}로 설정했습니다`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={selected} onValueChange={setSelected} disabled={pending}>
        <SelectTrigger className="w-full sm:flex-1">
          <SelectValue placeholder="상임위원회를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {committees.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={save} disabled={pending || !selected || selected === current}>
        {pending ? "저장 중…" : "저장"}
      </Button>
    </div>
  );
}
