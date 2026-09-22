import { embed, generateText } from "ai";
import { google } from "@ai-sdk/google";

// Vercel AI Gateway 대신 Google AI Studio 무료 티어(카드 등록 불필요)를 직접 사용.
// GOOGLE_GENERATIVE_AI_API_KEY 환경변수로 인증.
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = "gemini-3.6-flash";

export async function embedQuery(text: string) {
  const { embedding } = await embed({
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
    providerOptions: {
      google: { outputDimensionality: 1536, taskType: "RETRIEVAL_QUERY" },
    },
  });
  return embedding;
}

export type TrustLevel = "high" | "medium" | "low";

/**
 * pgvector `<=>` returns cosine distance (0 = identical, ~1+ = unrelated).
 * Thresholds are a starting heuristic — meant to be recalibrated once
 * real usage/feedback data (7-5) is available, per 7-8's TBD note.
 */
export function trustFromDistance(distance: number): TrustLevel {
  if (distance < 0.3) return "high";
  if (distance < 0.38) return "medium";
  return "low";
}

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  title: string;
  meta: string;
  sourceUrl: string | null;
  content: string;
  distance: number;
};

export async function generateGroundedAnswer(question: string, chunks: RetrievedChunk[]) {
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.title} (${c.meta})\n${c.content}`)
    .join("\n\n");

  const { text } = await generateText({
    model: google(CHAT_MODEL),
    system:
      "당신은 대한민국 지방의회 의원을 돕는 법령·조례·회의록 검색 비서입니다. " +
      "아래 제공된 근거 자료(context)에 있는 내용만 근거로 답변하세요. " +
      "문장 끝에는 사용한 근거 번호를 [1], [2] 형식으로 표기하세요. " +
      "근거 자료에 없는 내용은 추측하지 말고 답변하지 마세요. " +
      "한국어로, 의정활동에 바로 쓸 수 있도록 간결하고 정확하게 답하세요.",
    prompt: `질문: ${question}\n\n근거 자료:\n${context}`,
    // 근거 종합·인용 정도의 단순 작업이라 확장 사고(thinking)는 끄고 응답 속도를 우선함
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
    },
  });

  return text;
}
