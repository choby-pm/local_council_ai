"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import { createMemberProfile } from "./actions";

export function SignupForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [council, setCouncil] = useState("");
  const [committee, setCommittee] = useState("");
  const [district, setDistrict] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("비밀번호가 일치하지 않습니다");
      return;
    }
    if (!council || !committee || !district.trim()) {
      setFormError("소속 의회·상임위·지역구를 모두 입력해주세요");
      return;
    }

    const { error } = await signUp.password({
      emailAddress: email,
      password,
    });
    if (error) {
      setFormError(error.message ?? "가입 신청 중 오류가 발생했습니다");
      return;
    }

    const { error: codeError } = await signUp.verifications.sendEmailCode();
    if (codeError) {
      setFormError(codeError.message ?? "인증코드 발송에 실패했습니다");
      return;
    }
    setStep("verify");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      setFormError(error.message ?? "인증코드가 올바르지 않습니다");
      return;
    }

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: async () => {
          try {
            await createMemberProfile({ name, council, committee, district });
            router.push("/pending-approval");
          } catch (err) {
            console.error("createMemberProfile failed", err);
            router.push("/signup");
          }
        },
      });
    }
  }

  if (step === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>이메일 인증</CardTitle>
          <CardDescription>{email}로 발송된 6자리 코드를 입력해주세요</CardDescription>
        </CardHeader>
        <form onSubmit={handleVerify}>
          <CardContent className="flex flex-col items-center gap-4">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {(formError || errors?.global) && (
              <p className="text-sm text-destructive">
                {formError ?? errors?.global?.[0]?.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={fetchStatus === "fetching" || code.length < 6}>
              인증하고 가입 신청 완료
            </Button>
          </CardContent>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>회원가입</CardTitle>
        <CardDescription>
          가입 신청 후 마스터 계정 승인이 완료되어야 이용할 수 있습니다
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-name">이름</Label>
            <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-email">이메일</Label>
            <Input
              id="su-email"
              type="email"
              required
              placeholder="you@council.go.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-password">비밀번호</Label>
            <Input
              id="su-password"
              type="password"
              required
              minLength={8}
              placeholder="8자 이상 입력해주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-password-confirm">비밀번호 확인</Label>
            <Input
              id="su-password-confirm"
              type="password"
              required
              minLength={8}
              placeholder="비밀번호를 한 번 더 입력해주세요"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-council">소속 의회</Label>
            <Select value={council} onValueChange={setCouncil}>
              <SelectTrigger id="su-council" className="w-full">
                <SelectValue placeholder="소속 의회를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OO광역시의회">OO광역시의회</SelectItem>
                <SelectItem value="△△시의회">△△시의회</SelectItem>
                <SelectItem value="□□군의회">□□군의회</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              목록에 없다면 가입 후 별도 문의를 통해 확인합니다
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-committee">소속 상임위</Label>
            <Select value={committee} onValueChange={setCommittee}>
              <SelectTrigger id="su-committee" className="w-full">
                <SelectValue placeholder="상임위를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="행정안전위원회">행정안전위원회</SelectItem>
                <SelectItem value="복지환경위원회">복지환경위원회</SelectItem>
                <SelectItem value="예산결산특별위원회">예산결산특별위원회</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-district">지역구·비례</Label>
            <Input
              id="su-district"
              required
              placeholder="예: 3선거구 또는 비례대표"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>

          {(formError || errors?.global) && (
            <p className="text-sm text-destructive">
              {formError ?? errors?.global?.[0]?.message}
            </p>
          )}

          <div id="clerk-captcha" />

          <Button
            type="submit"
            className="mt-2 w-full"
            disabled={fetchStatus === "fetching" || password.length < 8 || password !== confirmPassword}
          >
            가입 신청
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
