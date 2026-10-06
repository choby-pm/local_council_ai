// 위원회별 행정사무감사 기간·대상을 회의록에서 뽑아 audit_schedules에 저장한다 (AI 사용 안 함).
// 사용법: npx dotenv -e .env.local -- npx tsx scripts/sync-audit-schedules.ts
// 매일 아침 크론(/api/cron/watch)도 같은 작업을 하므로, 수동 실행은 처음 한 번이나 확인용이다.
import { syncAuditSchedules } from "../src/lib/audit-schedules";

syncAuditSchedules()
  .then((r) => console.log(`계획서 회의록 ${r.found}건 확인, 감사 일정 ${r.saved}건 저장`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
