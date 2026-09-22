"use client";

import { useMemo, useState } from "react";
import { Check, History, MoreHorizontal, Pencil, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { cn } from "@/lib/utils";

export type ConversationItem = {
  id: string;
  title: string;
  updatedAt: string;
};

function ConversationRow({
  item,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  item: ConversationItem;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-1 py-1">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename(draft.trim() || item.title);
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(item.title);
              setEditing(false);
            }
          }}
          className="h-7 text-sm"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            onRename(draft.trim() || item.title);
            setEditing(false);
          }}
        >
          <Check className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            setDraft(item.title);
            setEditing(false);
          }}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/row flex items-center rounded-md pr-1 hover:bg-muted",
        active && "bg-muted"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col items-start px-2.5 py-2 text-left text-sm"
      >
        <span className={cn("line-clamp-1", active && "font-medium")}>{item.title}</span>
        <span className="text-xs text-muted-foreground">{item.updatedAt}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 opacity-0 group-hover/row:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            이름 변경
          </DropdownMenuItem>
          <ConfirmDeleteButton
            title="대화 삭제"
            description={`"${item.title}" 대화를 삭제하시겠습니까? 되돌릴 수 없습니다.`}
            onConfirm={onDelete}
            trigger={
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <span className="flex items-center gap-1.5">삭제</span>
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function List({
  items,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  items: ConversationItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <Button variant="outline" className="justify-start gap-2" onClick={onCreate}>
        <Plus className="size-4" />새 대화
      </Button>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="대화 검색"
          className="h-8 pl-7 text-sm"
        />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">검색 결과 없음</p>
        )}
        {filtered.map((item) => (
          <ConversationRow
            key={item.id}
            item={item}
            active={item.id === activeId}
            onSelect={() => onSelect(item.id)}
            onRename={(title) => onRename(item.id, title)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function ConversationList(props: {
  items: ConversationItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: 상시 노출되는 좌측 컬럼 */}
      <aside className="hidden w-60 shrink-0 border-r pr-3 md:flex">
        <List {...props} />
      </aside>

      {/* Mobile: 시트로 열리는 대화 목록 */}
      <div className="mb-2 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <History className="size-4" />
              대화 목록
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="px-0">
              <SheetTitle>대화 목록</SheetTitle>
            </SheetHeader>
            <div className="mt-2 h-[calc(100%-2rem)]">
              <List
                {...props}
                onSelect={(id) => {
                  props.onSelect(id);
                  setOpen(false);
                }}
                onCreate={() => {
                  props.onCreate();
                  setOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
