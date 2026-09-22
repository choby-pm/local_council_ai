"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TimerOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SessionExpiredDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hidden gap-1.5 text-muted-foreground lg:inline-flex">
          <TimerOff className="size-3.5" />
          세션 만료 미리보기
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TimerOff className="size-4 text-destructive" />
            세션이 만료되었습니다
          </DialogTitle>
          <DialogDescription>
            보안을 위해 일정 시간 이용이 없으면 자동 로그아웃됩니다. 작성 중이던 질문 내용은
            임시 보관을 시도했습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => {
              setOpen(false);
              router.push("/login");
            }}
          >
            다시 로그인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
