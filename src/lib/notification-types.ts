// 알림 유형 — DB(notifications.type)와 화면 필터가 공유. 클라이언트에서도 import 가능.
export const NOTIFICATION_TYPE_LABELS = {
  agenda: "안건",
  meeting: "회의록",
  law: "조례·법령",
  report: "보고서",
  data: "데이터",
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPE_LABELS;

export function isNotificationType(value: string): value is NotificationType {
  return Object.hasOwn(NOTIFICATION_TYPE_LABELS, value);
}
