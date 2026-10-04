import type { NotificationType } from "./notification-types";

// 문서 적재 시 생성할 공지 알림. seed-documents·backfill-notifications 스크립트가 공유하므로 server-only 의존 없음.

type DocumentForNotification = {
  id: string;
  type: "law" | "ordinance" | "meeting" | "budget";
  council: string | null;
  title: string;
  sourceMeta: Record<string, string> | null;
};

export function buildDocumentNotification(doc: DocumentForNotification) {
  // sourceMeta.date 예: "2026-09-03 부결", "2026-09-21", "2024-01-16 시행"
  const [date, ...rest] = (doc.sourceMeta?.date ?? "").split(" ");
  const status = rest.join(" ");

  const byType: Record<DocumentForNotification["type"], { type: NotificationType; title: string }> = {
    law: { type: "law", title: status ? `법령 ${status} 반영` : "법령 반영" },
    ordinance: { type: "law", title: status ? `조례안 ${status}` : "조례안 등록" },
    meeting: { type: "meeting", title: "회의록 공개" },
    budget: { type: "meeting", title: "예산 심사 회의록 공개" },
  };

  // 알림 시각은 적재 시각이 아니라 원문 일자(KST 09:00) 기준 — 시드 재적재 시에도 타임라인 유지
  const createdAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T09:00:00+09:00`) : new Date();

  return {
    ...byType[doc.type],
    council: doc.council,
    documentId: doc.id,
    description: doc.title,
    href: `/documents/${doc.id}`,
    createdAt,
  };
}
