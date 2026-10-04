import { APICallError, RetryError, createProviderRegistry, embed } from "ai";
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

export type ChatModelOption = { id: string; label: string; note: string };

// 의원이 AI 비서에서 고를 수 있는 모델. Gemini 무료 티어는 모델마다 하루 요청 한도가 따로 있다.
// 유료(Claude)는 ALLOW_PAID_MODELS=true일 때만 목록에 나온다.
const MODEL_OPTIONS: (ChatModelOption & { paid?: boolean })[] = [
  { id: "google:gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "최신" },
  { id: "google:gemini-3.6-flash", label: "Gemini 3.6 Flash", note: "기본" },
  { id: "google:gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", note: "빠름" },
  { id: "google:gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "이전 세대" },
  { id: "anthropic:claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "유료", paid: true },
  { id: "anthropic:claude-haiku-4-5", label: "Claude Haiku 4.5", note: "유료·빠름", paid: true },
];

export function chatModelOptions(): ChatModelOption[] {
  const allowPaid = process.env.ALLOW_PAID_MODELS === "true";
  const options = MODEL_OPTIONS.filter((m) => allowPaid || !m.paid).map(({ id, label, note }) => ({ id, label, note }));
  // CHAT_MODEL로 지정한 기본 모델이 목록에 없으면 맨 앞에 추가
  if (!options.some((m) => m.id === CHAT_MODEL)) options.unshift({ id: CHAT_MODEL, label: CHAT_MODEL, note: "기본" });
  return options;
}

/** 요청으로 들어온 모델 ID를 허용 목록으로 검증한다. 목록에 없으면 기본 모델 */
export function resolveRequestedModel(requested: unknown): string {
  return typeof requested === "string" && chatModelOptions().some((m) => m.id === requested) ? requested : CHAT_MODEL;
}

export function chatModel(modelId: string = CHAT_MODEL) {
  return registry.languageModel(modelId as ChatModelId);
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
