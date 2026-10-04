import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { committeesOf, getCouncilRoster, getLinkedCouncilMember } from "@/lib/council-members";
import { getActiveMember } from "@/lib/member";

import { CommitteePicker } from "./committee-picker";
import { CouncilMemberPicker } from "./council-member-picker";

const statusLabel: Record<string, string> = {
  pending: "승인대기",
  active: "활성",
  rejected: "거부됨",
  disabled: "비활성화",
};

export default async function MyPageAccountPage() {
  const member = await getActiveMember();
  if (!member) redirect("/login");

  const [roster, linked] = await Promise.all([
    getCouncilRoster(member.council),
    getLinkedCouncilMember(member),
  ]);

  const accountFields = [
    { label: "이름", value: member.name },
    { label: "아이디", value: member.username ?? "—" },
    { label: "소속 의회", value: member.council },
    { label: "권한", value: member.role === "master" ? "마스터(관리자)" : "일반 의원" },
    { label: "계정 상태", value: statusLabel[member.status] ?? member.status },
  ];

  const councilFields = linked
    ? [
        { label: "의원", value: `${linked.name}${linked.position && linked.position !== "의원" ? ` (${linked.position})` : ""}` },
        { label: "소속 위원회", value: linked.committees.join(", ") || "없음" },
        { label: "선거구", value: linked.district ?? "—" },
        { label: "담당 지역", value: linked.districtAreas.join(", ") || "—" },
      ]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">계정·소속 정보</h1>
        <p className="text-sm text-muted-foreground">
          의원 명단에서 본인을 선택하면 비서가 의원님의 위원회와 지역구에 맞춰집니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">의원 정보</CardTitle>
          <CardDescription>
            {linked ? "연결된 의원 정보입니다 (의회 홈페이지 기준)" : "아직 연결된 의원이 없습니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {councilFields.length > 0 && (
            <div className="flex flex-col divide-y">
              {councilFields.map((f, i) => (
                <div key={f.label} className={`flex items-center justify-between gap-4 py-3 ${i === 0 ? "pt-0" : ""}`}>
                  <Label className="shrink-0 text-muted-foreground">{f.label}</Label>
                  <span className="text-right text-sm font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          )}
          <CouncilMemberPicker
            roster={roster.map((m) => ({
              id: m.id,
              name: m.name,
              district: m.district,
              committees: m.committees,
            }))}
            linkedId={linked?.id ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">소속 상임위원회</CardTitle>
          <CardDescription>
            행정사무감사는 위원회별로 소관 부서를 감사합니다. 여기서 고른 위원회 기준으로 감사 준비 자료를 보여드립니다.
            {member.committee ? ` 현재: ${member.committee}` : " 아직 선택하지 않았습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommitteePicker
            committees={committeesOf(roster)}
            current={member.committee}
            linkedCommittees={linked?.committees ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {accountFields.map((f, i) => (
            <div key={f.label} className={`flex items-center justify-between py-3 ${i === 0 ? "pt-0" : ""}`}>
              <Label className="text-muted-foreground">{f.label}</Label>
              <span className="text-sm font-medium">{f.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-muted-foreground">
        비밀번호 변경은 로그인 화면의 &quot;비밀번호 재설정&quot;을 이용해주세요.
      </p>
    </div>
  );
}
