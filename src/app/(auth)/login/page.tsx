"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";

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

export default function LoginPage() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // 이미 로그인된 세션이면 폼을 보여주지 않고 곧장 이동 — "/"가 회원 상태에 맞는 화면으로 다시 분기함
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const { error } = await signIn.password({ identifier: email, password });
    if (error) {
      setFormError(error.message ?? "이메일 또는 비밀번호를 확인해주세요");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>지방의회 AI비서에 오신 것을 환영합니다</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@council.go.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">비밀번호</Label>
              <Link href="/reset-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                비밀번호 재설정
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {(formError || errors?.global) && (
            <p className="text-sm text-destructive">
              {formError ?? errors?.global?.[0]?.message}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={fetchStatus === "fetching"}>
            로그인
          </Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            회원가입
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
