import Link from "next/link";

import { ChatMenuPanel } from "@/components/chat/chat-menu-panel";
import { getAuditSuggestions } from "@/lib/audit";
import { getActiveMember } from "@/lib/member";

// 서비스의 중심 화면. 법령·조례, 회의록, 행감 지적사항을 에이전트가 도구로 찾아 답한다.
// 빈 대화에는 의원 위원회의 행감 질의 후보를 추천 질문으로 보여준다 (AI 호출 없이 계산).
export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const member = await getActiveMember();
  if (!member) return null;

  const { q } = await searchParams;
  const suggestions = member.committee ? await getAuditSuggestions(member.council, member.committee) : [];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:h-[calc(100vh-6.5rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 비서</h1>
        <p className="text-sm text-muted-foreground">
          법령·조례, 회의록, 행정사무감사 지적사항을 찾아 출처와 함께 답하고, 질의서·자료요구서 초안을 만들어 드립니다.
          {!member.committee && (
            <>
              {" "}
              <Link href="/mypage/account" className="underline underline-offset-2">
                소속 상임위를 고르면
              </Link>{" "}
              위원회에 맞춘 행감 질의 후보도 추천해 드립니다.
            </>
          )}
        </p>
      </div>

      <ChatMenuPanel
        menu="assistant"
        placeholder="예: 버스정책과가 작년 행정사무감사에서 지적받은 내용 알려줘"
        initialQuestion={typeof q === "string" ? q : undefined}
        suggestions={suggestions}
      />
    </div>
  );
}
