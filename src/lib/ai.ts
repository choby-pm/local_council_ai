import { APICallError, RetryError, createProviderRegistry, embed, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

// 답변 생성 모델은 CHAT_MODEL 환경변수("프로바이더:모델ID")로 교체한다. 예)
//   google:gemini-3.6-flash   — Google AI Studio 무료 티어 (GOOGLE_GENERATIVE_AI_API_KEY, 기본값)
//   anthropic:claude-sonnet-5-5 / anthropic:claude-haiku-4-5 / anthropic:claude-opus-5-5
//                              — Claude API (ANTHROPIC_API_KEY, Console에서 지출 한도 설정 권장)
// 각 프로바이더 키는 실제 호출 시점에 읽으므로, 쓰지 않는 프로바이더의 키는 없어도 된다.
//
// 비용 안전장치: 무료 티어가 없는 프로바이더(PAID_PROVIDERS)는 ALLOW_PAID_MODELS=true일 때만 허용.
// google은 API 키의 Cloud 프로젝트에 결제 계정이 연결되지 않은 한 무료 티어로만 동작(한도 초과 시 429, 과금 없음).
const registry = createProviderRegistry({ google, anthropic });

const SUPPORTED_PROVIDERS = ["google", "anthropic"] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];
type ChatModelId = `${Provider}:${string}`;

const PAID_PROVIDERS: readonly Provider[] = ["anthropic"];

const DEFAULT_CHAT_MODEL: ChatModelId = "google:gemini-3.6-flash";

function resolveChatModelId(): ChatModelId {
  const value = process.env.CHAT_MODEL?.trim();
  if (!value) return DEFAULT_CHAT_MODEL;

  const [provider, model] = value.split(":");
  if (!SUPPORTED_PROVIDERS.includes(provider as never) || !model) {
    throw new Error(
      `CHAT_MODEL="${value}" 형식이 올바르지 않습니다. ${SUPPORTED_PROVIDERS.map((p) => `"${p}:모델ID"`).join(" 또는 ")} 형식으로 지정하세요.`
    );
  }
  if (PAID_PROVIDERS.includes(provider as Provider) && process.env.ALLOW_PAID_MODELS !== "true") {
    throw new Error(
      `CHAT_MODEL="${value}"은 유료 API입니다. 비용 발생을 감수하고 사용하려면 ALLOW_PAID_MODELS=true를 함께 설정하세요.`
    );
  }
  return value as ChatModelId;
}

export const CHAT_MODEL = resolveChatModelId();

export function chatModel() {
  return registry.languageModel(CHAT_MODEL);
}

// 임베딩 모델은 교체 대상이 아님 — 바꾸면 저장된 document_chunks 임베딩을 전부 다시 만들어야 하고
// 차원(1536)도 스키마와 맞아야 한다. 시드 스크립트(seed-documents.ts)와 반드시 같은 모델을 써야 함.
export const EMBEDDING_MODEL = "gemini-embedding-001";

export async function embedQuery(text: string) {
  const { embedding } = await embed({
    model: registry.embeddingModel(`google:${EMBEDDING_MODEL}`),
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
    model: registry.languageModel(CHAT_MODEL),
    system:
      "당신은 대한민국 지방의회 의원을 돕는 법령·조례·회의록 검색 비서입니다. " +
      "아래 제공된 근거 자료(context)에 있는 내용만 근거로 답변하세요. " +
      "문장 끝에는 사용한 근거 번호를 [1], [2] 형식으로 표기하세요. " +
      "근거 자료에 없는 내용은 추측하지 말고 답변하지 마세요. " +
      "한국어로, 의정활동에 바로 쓸 수 있도록 간결하고 정확하게 답하세요.",
    prompt: `질문: ${question}\n\n근거 자료:\n${context}`,
    // 근거 종합·인용 정도의 단순 작업이라 추론은 최소로 두고 응답 속도·비용을 우선함.
    // providerOptions는 프로바이더별로 키가 나뉘어 있어, 현재 모델의 프로바이더 설정만 적용된다.
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
      anthropic: { effort: "low" },
    },
  });

  return text;
}

export type AiFailure = "quota" | "unavailable";

/**
 * LLM·임베딩 호출 실패를 사용자 안내용으로 분류.
 * quota: 프로바이더 요청·지출 한도 초과(429, Claude Console에서 직접 정한 지출 한도 도달 시 400 포함)
 */
export function classifyAiError(error: unknown): AiFailure {
  // generateText/embed는 기본 2회 재시도 후 RetryError로 감싸서 던짐
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (!APICallError.isInstance(cause)) return "unavailable";

  if (cause.statusCode === 429) return "quota";
  if (cause.statusCode === 400 && /usage limits/i.test(cause.responseBody ?? "")) return "quota";
  return "unavailable";
}
