export { cn } from "cn"

export function daysSince(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 요청으로 들어온 id를 uuid 컬럼 쿼리에 넣기 전 검사 — 형식이 틀리면 Postgres가 500을 던짐
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}
