"use server";

import { and, eq } from "drizzle-orm";
import { generateText } from "ai";

import { getDb } from "@/db";
import { auditDrafts } from "@/db/schema";
import { chatModel, CHAT_MODEL, classifyAiError } from "@/lib/ai";
import { getAuditFinding, getFindingHistory, type AuditFinding } from "@/lib/audit";
import { getActiveMember, type Member } from "@/lib/member";
import { isUuid } from "@/lib/utils";

export type DraftKind = "question" | "data_request";

type DraftResult = { ok: true; content: string; cached: boolean } | { ok: false; error: string };

function describe(f: AuditFinding) {
  return [
    `- 연도: ${f.year}년 행정사무감사 (${f.committee})`,
    `- 부서: ${f.department}`,
    f.project ? `- 사업: ${f.project}` : null,
    f.actionType ? `- 조치 구분: ${f.actionType}` : null,
    `- 지적: ${f.finding}`,
    f.request ? `- 요구: ${f.request}` : null,
    `- 출처: ${f.sourceTitle}${f.page ? ` ${f.page}쪽` : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const INSTRUCTIONS: Record<DraftKind, string> = {
  question:
    "올해 행정사무감사에서 이 사안을 다시 질의하기 위한 질의서 초안을 작성하세요.\n" +
    "형식:\n" +
    "1. 질의 제목 (한 줄)\n" +
    "2. 배경: 작년 지적과 요구 내용을 근거와 함께 2~3문장으로 요약 (이전 연도에도 지적됐다면 반복 사실을 명시)\n" +
    "3. 질의 사항: 집행부가 '예/아니오'로 피할 수 없도록 구체적인 질문 3~5개 (이행 여부, 이행 시점, 미이행 사유, 향후 계획, 관련 예산·집행 순)\n" +
    "4. 추가로 요구할 자료: 2~3개",
  data_request:
    "행정사무감사 전에 집행부에 보낼 자료요구서 초안을 작성하세요. 작년 지적사항의 처리결과는 공개되지 않으므로, 서면으로 확인하는 것이 목적입니다.\n" +
    "형식:\n" +
    "1. 제목: '○○○ 관련 자료 제출 요구'\n" +
    "2. 대상 부서\n" +
    "3. 요구 배경: 작년 지적·요구 내용 1~2문장\n" +
    "4. 요구 자료 목록: 번호를 매겨 4~6개 (지적사항 처리결과와 근거 문서, 추진 일정, 관련 예산 편성·집행 내역, 주민 의견 수렴 등 사안에 맞게)\n" +
    "5. 제출 기한: '행정사무감사 개시 7일 전까지'",
};

async function writeDraft(member: Member, finding: AuditFinding, kind: DraftKind) {
  const history = await getFindingHistory(finding);
  const { text } = await generateText({
    model: chatModel(),
    maxRetries: 2,
    system:
      "당신은 지방의회 의원의 의정 비서관입니다. 의원이 행정사무감사를 준비하도록 문서 초안을 씁니다. " +
      "아래 제공된 지적사항과 이력에 있는 사실만 사용하고, 숫자·날짜·사실을 지어내지 마세요. " +
      "확인되지 않은 내용은 질문이나 요구 자료로 돌리세요. 공문서체로, 의원이 바로 고쳐 쓸 수 있게 간결하게 쓰세요. " +
      "정치적 입장이나 평가는 넣지 마세요.",
    prompt:
      `의원: ${member.name} (${member.committee ?? finding.committee})\n\n` +
      `[작년 지적사항]\n${describe(finding)}\n\n` +
      (history.length > 0
        ? `[이전 연도에도 같은 사업으로 지적된 내용]\n${history.map(describe).join("\n\n")}\n\n`
        : "") +
      INSTRUCTIONS[kind],
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
      anthropic: { effort: "low" },
    },
  });
  return text.trim();
}

/**
 * 지적사항 카드의 질의서·자료요구서 초안. 이미 만든 초안이 있으면 AI를 다시 부르지 않고 돌려준다
 * (무료 티어 한도 보호, 결정 D-20). regenerate=true일 때만 새로 생성한다.
 */
export async function getOrCreateAuditDraft(
  findingId: string,
  kind: DraftKind,
  regenerate = false
): Promise<DraftResult> {
  const member = await getActiveMember();
  if (!member) return { ok: false, error: "이용 권한이 없습니다" };
  if (!isUuid(findingId) || (kind !== "question" && kind !== "data_request")) {
    return { ok: false, error: "잘못된 요청입니다" };
  }

  const finding = await getAuditFinding(findingId);
  if (!finding || finding.council !== member.council) return { ok: false, error: "지적사항을 찾을 수 없습니다" };

  const db = getDb();
  const where = and(
    eq(auditDrafts.memberId, member.id),
    eq(auditDrafts.findingId, findingId),
    eq(auditDrafts.kind, kind)
  );

  if (!regenerate) {
    const [existing] = await db.select().from(auditDrafts).where(where);
    if (existing) return { ok: true, content: existing.content, cached: true };
  }

  let content: string;
  try {
    content = await writeDraft(member, finding, kind);
  } catch (error) {
    const failure = classifyAiError(error);
    console.error(`[audit-draft] ${CHAT_MODEL} 호출 실패 (${failure})`, error);
    return {
      ok: false,
      error:
        failure === "quota"
          ? "오늘 AI 사용량 한도에 도달했습니다. 한도가 초기화된 뒤 다시 시도해주세요."
          : "AI 서비스와 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  await db
    .insert(auditDrafts)
    .values({ memberId: member.id, findingId, kind, content })
    .onConflictDoUpdate({
      target: [auditDrafts.memberId, auditDrafts.findingId, auditDrafts.kind],
      set: { content, updatedAt: new Date() },
    });

  return { ok: true, content, cached: false };
}
