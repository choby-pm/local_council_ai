"use client";

import { useActionState } from "react";
import Link from "next/link";

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

import { signup } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const fieldErrors = state?.fieldErrors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>이름과 아이디, 비밀번호만 입력하면 바로 이용할 수 있습니다</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              placeholder="홍길동"
              defaultValue={state?.values?.name}
              aria-invalid={!!fieldErrors?.name}
            />
            {fieldErrors?.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              placeholder="영문 소문자·숫자·밑줄 4~20자"
              defaultValue={state?.values?.username}
              aria-invalid={!!fieldErrors?.username}
            />
            {fieldErrors?.username && (
              <p className="text-xs text-destructive">{fieldErrors.username}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="8자 이상"
              aria-invalid={!!fieldErrors?.password}
            />
            {fieldErrors?.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="mt-2 w-full" disabled={pending}>
            {pending ? "가입 중…" : "가입하고 시작하기"}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            로그인
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
