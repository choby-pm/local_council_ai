"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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

import { createMemberProfile } from "./actions";

export function CompleteProfileForm() {
  const { user } = useUser();
  const router = useRouter();

  const [name, setName] = useState(user?.firstName ?? "");
  const [council, setCouncil] = useState("");
  const [committee, setCommittee] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !council || !committee || !district.trim()) {
      setError("이름·소속 의회·상임위·지역구를 모두 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      await createMemberProfile({ name, council, committee, district });
      router.push("/pending-approval");
    } catch (err) {
      console.error(err);
      setError("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>가입 정보 입력</CardTitle>
        <CardDescription>
          이메일 인증은 완료되었습니다. 소속 정보만 마저 입력하면 가입 신청이 끝나요.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-name">이름</Label>
            <Input id="cp-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-council">소속 의회</Label>
            <Select value={council} onValueChange={setCouncil}>
              <SelectTrigger id="cp-council" className="w-full">
                <SelectValue placeholder="소속 의회를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="고양특례시의회">고양특례시의회 (시범 연동)</SelectItem>
                <SelectItem value="OO광역시의회">OO광역시의회</SelectItem>
                <SelectItem value="△△시의회">△△시의회</SelectItem>
                <SelectItem value="□□군의회">□□군의회</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-committee">소속 상임위</Label>
            <Select value={committee} onValueChange={setCommittee}>
              <SelectTrigger id="cp-committee" className="w-full">
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
            <Label htmlFor="cp-district">지역구·비례</Label>
            <Input
              id="cp-district"
              required
              placeholder="예: 3선거구 또는 비례대표"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="mt-2 w-full" disabled={submitting}>
            가입 신청 완료
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
