export { cn } from "cn"

export function daysSince(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 요청으로 들어온 id를 uuid 컬럼 쿼리에 넣기 전 검사 — 형식이 틀리면 Postgres가 500을 던짐
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

/** "방금 전", "10분 전", "3시간 전", "어제", "5일 전", 그 이상은 날짜(KST) */
export function formatRelativeTime(date: Date, now = new Date()) {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days === 1) return "어제"
  if (days < 7) return `${days}일 전`
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(date)
}
