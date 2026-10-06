import { APICallError, RetryError, createProviderRegistry, embed } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

// 답변 생성 모델은 CHAT_MODEL 환경변수("프로바이더:모델ID")로 교체한다. 예)
//   google:gemini-3.6-flash   — Google AI Studio 무료 티어 (GOOGLE_GENERATIVE_AI_API_KEY, 기본값)
//   groq:openai/gpt-oss-120b — Groq 무료 티어 (GROQ_API_KEY, 카드 등록 불필요, 모델별 하루 한도)
//   anthropic:claude-sonnet-5-5 / anthropic:claude-haiku-4-5 / anthropic:claude-opus-5-5
//                              — Claude API (ANTHROPIC_API_KEY, Console에서 지출 한도 설정 권장)
// 각 프로바이더 키는 실제 호출 시점에 읽으므로, 쓰지 않는 프로바이더의 키는 없어도 된다.
//
// 비용 안전장치: 무료 티어가 없는 프로바이더(PAID_PROVIDERS)는 ALLOW_PAID_MODELS=true일 때만 허용.
// google은 API 키의 Cloud 프로젝트에 결제 계정이 연결되지 않은 한 무료 티어로만 동작(한도 초과 시 429, 과금 없음).
const registry = createProviderRegistry({ google, anthropic, groq });

const SUPPORTED_PROVIDERS = ["google", "anthropic", "groq"] as const;
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

// 의원이 AI 비서에서 고를 수 있는 모델. 무료 티어(Gemini, Groq)는 모델마다 하루 요청 한도가 따로라
// 모델을 바꿔 가며 쓰면 전체 질문 가능량이 늘어난다.
// requiresEnv: 해당 키가 설정된 경우에만 목록에 나온다. paid: ALLOW_PAID_MODELS=true일 때만 나온다.
const MODEL_OPTIONS: (ChatModelOption & { paid?: boolean; requiresEnv?: string })[] = [
  { id: "google:gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "최신" },
  { id: "google:gemini-3.6-flash", label: "Gemini 3.6 Flash", note: "기본" },
  { id: "google:gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", note: "빠름" },
  { id: "google:gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "이전 세대" },
  // OpenAI가 공개한 오픈 모델을 Groq 무료 티어로 (하루 약 1,000회)
  { id: "groq:openai/gpt-oss-120b", label: "GPT-OSS 120B", note: "무료·Groq", requiresEnv: "GROQ_API_KEY" },
  { id: "groq:openai/gpt-oss-20b", label: "GPT-OSS 20B", note: "무료·Groq·빠름", requiresEnv: "GROQ_API_KEY" },
  { id: "anthropic:claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "유료", paid: true },
  { id: "anthropic:claude-haiku-4-5", label: "Claude Haiku 4.5", note: "유료·빠름", paid: true },
];

export function chatModelOptions(): ChatModelOption[] {
  const allowPaid = process.env.ALLOW_PAID_MODELS === "true";
  const options = MODEL_OPTIONS.filter(
    (m) => (allowPaid || !m.paid) && (!m.requiresEnv || Boolean(process.env[m.requiresEnv]))
  ).map(({ id, label, note }) => ({ id, label, note }));
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

// 한도 초과(429)를 받은 모델은 잠시 건너뛴다. 서버 인스턴스별 메모리라 정확한 공유는 아니지만,
// 같은 인스턴스에서 매 질문마다 이미 막힌 모델부터 다시 부르는 낭비를 줄인다.
const EXHAUSTED_SKIP_MS = 60 * 60 * 1000;
const exhaustedUntil = new Map<string, number>();

export function markModelExhausted(modelId: string) {
  exhaustedUntil.set(modelId, Date.now() + EXHAUSTED_SKIP_MS);
}

/**
 * 답변을 시도할 모델 순서: 의원이 고른 모델 → 기본 모델 → 나머지 무료 모델.
 * 무료 티어는 모델마다 한도가 따로라, 고른 모델이 막혀도 다른 무료 모델로 답할 수 있다.
 * 유료 모델은 의원이 직접 고른 경우에만 쓰고 자동 전환 대상에는 넣지 않는다.
 */
export function modelAttemptOrder(selected: string): string[] {
  const free = MODEL_OPTIONS.filter((m) => !m.paid && (!m.requiresEnv || Boolean(process.env[m.requiresEnv]))).map(
    (m) => m.id
  );
  const order = [...new Set([selected, CHAT_MODEL, ...free])];
  const now = Date.now();
  const available = order.filter((id) => (exhaustedUntil.get(id) ?? 0) <= now);
  // 전부 막혀 있으면 고른 모델로 한 번은 시도 (한도가 이미 풀렸을 수 있음)
  return available.length > 0 ? available : [selected];
}

export function modelLabel(modelId: string): string {
  return MODEL_OPTIONS.find((m) => m.id === modelId)?.label ?? modelId;
}
