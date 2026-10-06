// 위원회별 행정사무감사 기간·대상을 "행정사무감사계획서 작성의 건" 회의록 본문에서 뽑아 저장한다.
// 부서별 날짜는 회의에서 배부한 계획서에만 있고 공개되지 않아, 공개된 기간과 대상 문장만 쓴다.
// 크론(/api/cron/watch)과 scripts/sync-audit-schedules.ts가 함께 쓰므로 상대 경로로만 import한다.
import { getDb } from "../db";
import { auditSchedules } from "../db/schema";
import { getMinutesText, searchMinutes } from "./goyang-council";

const COUNCIL = "고양특례시의회";

// "감사실시 기간은 2026년 11월 12일부터 11월 19일까지 8일간이며"
const PERIOD = /감사\s*실시\s*기간은\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일부터\s*(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일까지/;
// "감사 대상기관과 부서를 말씀드리면 … 감사를 실시하겠습니다"
const SCOPE = /감사\s*대상\s*기관과\s*부서를\s*말씀드리면\s*([^.]*?)(?:에\s*대해서\s*)?감사를\s*실시하겠습니다/;

const pad = (n: string) => n.padStart(2, "0");

export async function syncAuditSchedules(): Promise<{ found: number; saved: number }> {
  // 회의명에 위원회 이름이 들어 있으므로 한 단어로 검색한 뒤 제목으로 고른다
  const hits = (await searchMinutes("행정사무감사계획서", { terms: [10], limit: 20 })).filter((h) =>
    h.title.includes("위원회")
  );

  let saved = 0;
  for (const hit of hits) {
    const committee = hit.title.match(/([가-힣]+위원회)/)?.[1];
    if (!committee) continue;

    const { text, url, title } = await getMinutesText(hit.uid);
    const period = text.match(PERIOD);
    if (!period) continue;
    const [, y1, m1, d1, y2, m2, d2] = period;
    const year = Number(y1);

    const values = {
      council: COUNCIL,
      committee,
      year,
      startDate: `${y1}-${pad(m1)}-${pad(d1)}`,
      endDate: `${y2 ?? y1}-${pad(m2)}-${pad(d2)}`,
      scope: text.match(SCOPE)?.[1]?.replace(/\s+/g, " ").trim() ?? null,
      sourceTitle: title,
      sourceUrl: url,
      updatedAt: new Date(),
    };
    await getDb()
      .insert(auditSchedules)
      .values(values)
      .onConflictDoUpdate({
        target: [auditSchedules.council, auditSchedules.committee, auditSchedules.year],
        set: values,
      });
    saved++;
  }
  return { found: hits.length, saved };
}

export type AuditScheduleView = {
  committee: string;
  year: number;
  startDate: string;
  endDate: string;
  scope: string | null;
  sourceUrl: string;
  // 시작까지 남은 일수(한국 시간 기준). 진행 중이면 0, 끝났으면 null
  daysLeft: number | null;
  status: "upcoming" | "ongoing" | "done";
};

function todayKst(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

/** 위원회의 가장 최근 행감 일정 (대시보드·AI 비서 표시용) */
export async function getAuditSchedule(council: string, committee: string, now: Date): Promise<AuditScheduleView | null> {
  const rows = await getDb().select().from(auditSchedules);
  const row = rows
    .filter((r) => r.council === council && r.committee === committee)
    .sort((a, b) => b.year - a.year)[0];
  if (!row) return null;

  const today = todayKst(now);
  const status = today < row.startDate ? "upcoming" : today <= row.endDate ? "ongoing" : "done";
  const daysLeft =
    status === "upcoming" ? Math.round((Date.parse(row.startDate) - Date.parse(today)) / 86_400_000) : status === "ongoing" ? 0 : null;

  return {
    committee: row.committee,
    year: row.year,
    startDate: row.startDate,
    endDate: row.endDate,
    scope: row.scope,
    sourceUrl: row.sourceUrl,
    daysLeft,
    status,
  };
}

export function formatAuditPeriod(s: Pick<AuditScheduleView, "startDate" | "endDate">) {
  const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
  return `${md(s.startDate)} ~ ${md(s.endDate)}`;
}
