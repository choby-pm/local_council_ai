"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { changePassword } from "./actions";

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && next !== confirm;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    startTransition(async () => {
      const result = await changePassword(current, next);
      if (result.ok) {
        toast.success("비밀번호를 변경했습니다");
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-current">현재 비밀번호</Label>
        <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-next">새 비밀번호</Label>
        <Input id="pw-next" type="password" autoComplete="new-password" placeholder="8자 이상" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-confirm">새 비밀번호 확인</Label>
        <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {mismatch && <p className="text-xs text-destructive">새 비밀번호가 일치하지 않습니다</p>}
      </div>
      <Button type="submit" className="self-start" disabled={pending || !current || next.length < 8 || mismatch || !confirm}>
        {pending ? "변경 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
