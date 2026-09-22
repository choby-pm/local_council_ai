"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<"request" | "sent" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: createErr } = await signIn.create({ identifier: email });
    if (createErr) {
      setError(createErr.message ?? "계정을 찾을 수 없습니다");
      return;
    }
    const { error: err } = await signIn.resetPasswordEmailCode.sendCode();
    if (err) {
      setError(err.message ?? "재설정 코드 발송에 실패했습니다");
      return;
    }
    setStep("sent");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: err } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (err) {
      setError(err.message ?? "코드가 올바르지 않습니다. 링크가 만료되었으면 재발급해주세요");
      return;
    }
    setStep("reset");
  }

  async function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }
    const { error: err } = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
    });
    if (err) {
      setError(err.message ?? "비밀번호 변경에 실패했습니다");
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => router.push(decorateUrl("/")),
      });
    }
  }

  if (step === "sent") {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <MailCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle>재설정 코드를 보냈습니다</CardTitle>
          <CardDescription>{email}로 전송된 코드를 입력해주세요. 코드는 일정 시간 후 만료됩니다.</CardDescription>
        </CardHeader>
        <form onSubmit={handleVerify}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-code">인증 코드</Label>
              <Input id="rp-code" required value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={fetchStatus === "fetching"}>
              코드 확인
            </Button>
          </CardContent>
        </form>
      </Card>
    );
  }

  if (step === "reset") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>새 비밀번호 설정</CardTitle>
          <CardDescription>새로 사용할 비밀번호를 입력해주세요</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmitPassword}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-new-password">새 비밀번호</Label>
              <Input
                id="rp-new-password"
                type="password"
                required
                minLength={8}
                placeholder="8자 이상 입력해주세요"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rp-new-password-confirm">새 비밀번호 확인</Label>
              <Input
                id="rp-new-password-confirm"
                type="password"
                required
                minLength={8}
                placeholder="비밀번호를 한 번 더 입력해주세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={fetchStatus === "fetching" || newPassword.length < 8 || newPassword !== confirmPassword}
            >
              비밀번호 변경
            </Button>
          </CardContent>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 재설정</CardTitle>
        <CardDescription>가입하신 이메일로 재설정 코드를 보내드립니다</CardDescription>
      </CardHeader>
      <form onSubmit={handleRequest}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-email">이메일</Label>
            <Input
              id="rp-email"
              type="email"
              required
              placeholder="you@council.go.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={fetchStatus === "fetching"}>
            재설정 코드 보내기
          </Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center border-t pt-4">
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">
          로그인으로 돌아가기
        </Link>
      </CardFooter>
    </Card>
  );
}
