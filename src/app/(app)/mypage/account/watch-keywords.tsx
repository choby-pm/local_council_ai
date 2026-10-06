"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { addWatchKeyword, removeWatchKeyword } from "./actions";

export function WatchKeywords({ items }: { items: { id: string; keyword: string }[] }) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    const keyword = draft.trim();
    if (!keyword) return;
    startTransition(async () => {
      const result = await addWatchKeyword(keyword);
      if (result.ok) setDraft("");
      else toast.error(result.error);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeWatchKeyword(id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="예: 버스 준공영제, 벽제수질복원센터"
          maxLength={20}
          disabled={pending}
        />
        <Button onClick={add} disabled={pending || draft.trim().length < 2}>
          추가
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">등록한 관심 사업이 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((w) => (
            <Badge key={w.id} variant="secondary" className="gap-1 py-1 pr-1 pl-2.5 font-normal">
              {w.keyword}
              <button
                type="button"
                onClick={() => remove(w.id)}
                disabled={pending}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label={`${w.keyword} 삭제`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
