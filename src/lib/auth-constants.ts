// proxy.ts(쿠키 유무 검사)와 lib/auth.ts가 공유 — auth.ts는 DB·server-only 의존이 있어 proxy에서 직접 import하지 않음
export const SESSION_COOKIE = "session";
