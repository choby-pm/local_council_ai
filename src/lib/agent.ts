import "server-only";

import { and, cosineDistance, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { generateText, isStepCount, tool, type ModelMessage } from "ai";
import { z } from "zod";

import { getDb } from "@/db";
import { auditFindings, documentChunks, documents } from "@/db/schema";
import { chatModel, embedQuery } from "@/lib/ai";
import { readMinutesExcerpts, searchMinutes } from "@/lib/goyang-council";
import type { Member } from "@/lib/member";

export type DocType = "law" | "ordinance" | "meeting" | "budget";

export type AgentSource = {
  index: number;
  documentId: string;
  sourceUrl: string | null;
  title: string;
  meta: string;
  excerpt: string;
};

export type AgentResult = {
  text: string;
  // 답변에서 실제로 인용한 출처만
  sources: AgentSource[];
  // 도구 호출 결과로 모은 전체 출처 수 (인용 여부와 무관)
  gathered: number;
};

// 무료 티어는 모델당 하루 요청 수가 적어(결정 D-20) 한 질문의 단계 수를 작게 묶는다
const MAX_STEPS = 5;

function systemPrompt(member: Member) {
  const profile = [
    `의원: ${member.name}`,
    `소속: ${member.council}${member.committee ? ` ${member.committee}` : ""}`,
    member.district ? `선거구: ${member.district}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    "당신은 지방의회 의원 한 명을 전담하는 AI 의정 비서관입니다. 의원은 법·행정·재정 전문가가 아닐 수 있으니 " +
    "어려운 용어는 쉽게 풀어 설명하고, 의원이 다음에 무엇을 하면 되는지 짚어 주세요.\n\n" +
    `[담당 의원]\n${profile}\n\n` +
    "[원칙]\n" +
    "- 답하기 전에 도구로 근거를 찾으세요. 행정사무감사·지적사항 질문은 getAuditFindings, 의원 발언이나 회의 내용은 searchMinutes → readMinutes, 법령·조례는 searchDocuments를 쓰세요.\n" +
    "- 도구 결과에 있는 내용만 근거로 쓰고, 문장 끝에 도구 결과의 ref 번호를 [1], [2] 형식으로 표기하세요.\n" +
    "- 숫자·날짜·이름을 지어내지 마세요. 찾지 못했으면 찾지 못했다고 말하고, 확인 방법(자료요구 등)을 제안하세요.\n" +
    "- 특별한 말이 없으면 의원의 위원회를 기준으로 범위를 잡으세요.\n" +
    "- 정치적 입장이나 평가는 하지 말고, 판단은 의원에게 맡기세요.\n" +
    "- 한국어로, 의정활동에 바로 쓸 수 있게 간결하게 답하세요."
  );
}

/**
 * 의원 전속 비서 에이전트. 질문에 따라 도구를 골라 여러 번 호출하고, 모은 근거로 답한다.
 * 의회 범위(테넌시)는 각 도구의 쿼리가 member.council로 강제한다 — 모델 입력으로 바꿀 수 없음.
 */
export async function runCouncilAgent(opts: {
  member: Member;
  docTypes: DocType[];
  history: ModelMessage[];
  question: string;
}): Promise<AgentResult> {
  const { member, docTypes } = opts;
  const gathered: AgentSource[] = [];

  function addSource(s: Omit<AgentSource, "index">) {
    const index = gathered.length + 1;
    gathered.push({ ...s, index });
    return index;
  }

  const tools = {
    searchDocuments: tool({
      description: "서비스에 적재된 법령·조례·회의록·예산 문서를 의미 검색합니다. 법령·조례 조문이나 문서 내용을 찾을 때 사용합니다.",
      inputSchema: z.object({
        query: z.string().describe("찾을 내용 (자연어)"),
      }),
      execute: async ({ query }) => {
        const embedding = await embedQuery(query);
        const distance = cosineDistance(documentChunks.embedding, embedding);
        const rows = await getDb()
          .select({
            documentId: documents.id,
            title: documents.title,
            sourceMeta: documents.sourceMeta,
            sourceUrl: documents.sourceUrl,
            content: documentChunks.content,
            distance,
          })
          .from(documentChunks)
          .innerJoin(documents, eq(documents.id, documentChunks.documentId))
          .where(and(inArray(documents.type, docTypes), or(isNull(documents.council), eq(documents.council, member.council))))
          .orderBy(distance)
          .limit(4);

        // 거리가 먼 결과는 근거로 쓰지 않음 (기존 신뢰도 기준과 같은 0.38)
        return rows
          .filter((r) => Number(r.distance) < 0.38)
          .map((r) => {
            const meta = r.sourceMeta ? Object.values(r.sourceMeta).join(" · ") : "";
            const ref = addSource({ documentId: r.documentId, sourceUrl: r.sourceUrl, title: r.title, meta, excerpt: r.content });
            return { ref, title: r.title, meta, content: r.content };
          });
      },
    }),

    getAuditFindings: tool({
      description:
        "행정사무감사 결과보고서에서 정리한 지적사항(부서, 사업, 지적 내용, 요구 사항, 조치 구분)을 조회합니다. " +
        "기본 범위는 의원의 소속 위원회이며, 여러 연도가 있으면 반복 지적 여부를 볼 수 있습니다.",
      inputSchema: z.object({
        department: z.string().optional().describe("부서명 일부 (예: 버스정책과, 상하수도사업소)"),
        keyword: z.string().optional().describe("사업명이나 지적 내용에 들어갈 단어 (예: 준공영제, 현수막)"),
        year: z.number().int().optional().describe("감사 연도 (예: 2025)"),
        allCommittees: z.boolean().optional().describe("다른 위원회까지 볼 때만 true"),
      }),
      execute: async ({ department, keyword, year, allCommittees }) => {
        const conditions = [eq(auditFindings.council, member.council)];
        if (!allCommittees && member.committee) conditions.push(eq(auditFindings.committee, member.committee));
        if (department) conditions.push(ilike(auditFindings.department, `%${department}%`));
        if (year) conditions.push(eq(auditFindings.year, year));
        if (keyword) {
          conditions.push(
            or(
              ilike(auditFindings.project, `%${keyword}%`),
              ilike(auditFindings.finding, `%${keyword}%`),
              ilike(auditFindings.request, `%${keyword}%`)
            )!
          );
        }

        const rows = await getDb()
          .select()
          .from(auditFindings)
          .where(and(...conditions))
          .orderBy(desc(auditFindings.year), auditFindings.page)
          .limit(12);

        return rows.map((f) => {
          const ref = addSource({
            documentId: "",
            sourceUrl: f.sourceUrl,
            title: `${f.year}년 ${f.committee} 행정사무감사 결과보고서`,
            meta: [f.department, f.page ? `${f.page}쪽` : null].filter(Boolean).join(" · "),
            excerpt: [f.project ? `[${f.project}]` : null, f.finding, f.request ? `요구: ${f.request}` : null]
              .filter(Boolean)
              .join(" "),
          });
          return {
            ref,
            year: f.year,
            committee: f.committee,
            department: f.department,
            project: f.project,
            actionType: f.actionType,
            finding: f.finding,
            request: f.request,
          };
        });
      },
    }),

    searchMinutes: tool({
      description:
        "고양특례시의회 홈페이지에서 회의록 목록을 검색합니다 (제10대·제9대). 결과는 회의명과 uid뿐이므로 " +
        "내용이 필요하면 readMinutes로 이어서 읽으세요. 검색은 첫 단어로만 되고, 나머지 단어는 회의명으로 거릅니다. 10~20초 걸립니다.",
      inputSchema: z.object({
        query: z.string().describe("핵심 단어 하나를 먼저 (예: '벽제수질복원센터', '준공영제 건설교통위원회')"),
      }),
      execute: async ({ query }) => {
        const hits = await searchMinutes(query);
        return hits.map((h) => ({ uid: h.uid, title: h.title }));
      },
    }),

    readMinutes: tool({
      description: "회의록 한 건에서 검색어가 나오는 부분의 발언을 발췌합니다. searchMinutes 결과의 uid를 넣으세요.",
      inputSchema: z.object({
        uid: z.string().describe("회의록 uid"),
        keyword: z.string().describe("발췌할 부분의 검색어"),
      }),
      execute: async ({ uid, keyword }) => {
        const result = await readMinutesExcerpts(uid, keyword);
        if (result.excerpts.length === 0) return { found: false, title: result.title };
        const ref = addSource({
          documentId: "",
          sourceUrl: result.url,
          title: result.title,
          meta: `회의록 발췌 · "${keyword}"`,
          excerpt: result.excerpts[0],
        });
        return { found: true, ref, title: result.title, excerpts: result.excerpts };
      },
    }),
  };

  const { text } = await generateText({
    model: chatModel(),
    system: systemPrompt(opts.member),
    messages: [...opts.history, { role: "user", content: opts.question }],
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    // 재시도도 하루 요청 한도를 소모하므로 최소로
    maxRetries: 1,
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
      anthropic: { effort: "low" },
    },
  });

  const cited = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  return {
    text: text.trim(),
    sources: gathered.filter((s) => cited.has(s.index)),
    gathered: gathered.length,
  };
}
