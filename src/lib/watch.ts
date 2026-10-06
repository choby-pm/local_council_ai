// 관심 사업 알림: 새로 공개된 회의록을 확인해, 의원이 등록한 키워드가 나오면 개인 알림을 만든다 (AI 사용 안 함).
// 어디까지 확인했는지는 batches 테이블의 한 행(note: "last_uid:N")에 기록한다.
import { and, eq } from "drizzle-orm";

import { getDb } from "../db";
import { batches, members, notifications, watchKeywords } from "../db/schema";
import { getMinutesText, listRecentMinutes } from "./goyang-council";

const BATCH_NAME = "관심 사업 회의록 확인";
const COUNCIL = "고양특례시의회";
// 한 번에 읽는 새 회의록 수 상한 (회의록 1건이 수십만 자라 시간 제한 안에서 끝내기 위함)
const MAX_PER_RUN = 10;

export async function scanWatchKeywords(): Promise<{ newMinutes: number; notified: number; lastUid: string | null }> {
  const db = getDb();
  const [state] = await db.select().from(batches).where(eq(batches.name, BATCH_NAME));
  const lastUid = Number(state?.note?.match(/last_uid:(\d+)/)?.[1] ?? 0);

  const recent = await listRecentMinutes(2);
  const newestUid = Math.max(lastUid, ...recent.map((m) => Number(m.uid)));

  // 처음 실행이면 기준점만 잡는다 (지난 회의록 전체로 알림을 쏟아내지 않기 위함)
  const fresh = lastUid === 0 ? [] : recent.filter((m) => Number(m.uid) > lastUid).reverse().slice(0, MAX_PER_RUN);

  const watchers = await db
    .select({ memberId: watchKeywords.memberId, keyword: watchKeywords.keyword })
    .from(watchKeywords)
    .innerJoin(members, eq(members.id, watchKeywords.memberId))
    .where(and(eq(members.status, "active"), eq(members.council, COUNCIL)));

  let notified = 0;
  let processedUid = lastUid;
  for (const minutes of fresh) {
    if (watchers.length > 0) {
      const { text } = await getMinutesText(minutes.uid);
      const shortTitle = minutes.title.split(/\s*\[\d+\]/)[0];
      for (const w of watchers) {
        if (!text.includes(w.keyword)) continue;
        await db.insert(notifications).values({
          memberId: w.memberId,
          council: COUNCIL,
          type: "watch",
          title: `관심 사업 "${w.keyword}"이(가) 새 회의록에 나왔습니다`,
          description: `${shortTitle} · ${minutes.date}`,
          href: minutes.url,
        });
        notified++;
      }
    }
    processedUid = Number(minutes.uid);
  }

  // 이번에 다 읽지 못한 회의록은 다음 실행에서 이어서 읽는다
  const nextUid = fresh.length === MAX_PER_RUN ? processedUid : newestUid;
  const note = `last_uid:${nextUid}`;
  if (state) {
    await db
      .update(batches)
      .set({ status: "success", lastRunAt: new Date(), note })
      .where(eq(batches.id, state.id));
  } else {
    await db.insert(batches).values({ name: BATCH_NAME, cycle: "매일 07시", status: "success", lastRunAt: new Date(), note });
  }

  return { newMinutes: fresh.length, notified, lastUid: nextUid ? String(nextUid) : null };
}
