import { NextRequest, NextResponse } from "next/server";

import { syncAuditSchedules } from "@/lib/audit-schedules";
import { scanWatchKeywords } from "@/lib/watch";

/**
 * 매일 아침(vercel.json crons) 실행: 새 회의록에서 관심 사업 키워드를 찾아 알림을 만들고,
 * 행정사무감사계획서 회의록에서 감사 일정을 갱신한다. AI는 쓰지 않는다.
 * Vercel은 CRON_SECRET 환경변수가 있으면 Authorization: Bearer <값>을 붙여 호출한다.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET이 설정되지 않았습니다" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 });
  }

  const [watch, schedules] = await Promise.allSettled([scanWatchKeywords(), syncAuditSchedules()]);
  const result = {
    watch: watch.status === "fulfilled" ? watch.value : { error: String(watch.reason) },
    schedules: schedules.status === "fulfilled" ? schedules.value : { error: String(schedules.reason) },
  };
  console.log("[cron/watch]", JSON.stringify(result));
  return NextResponse.json(result);
}
