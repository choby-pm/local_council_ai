// 새 회의록에서 관심 사업 키워드를 찾아 알림을 만든다 (매일 아침 크론과 같은 작업, AI 사용 안 함).
// 사용법: npx dotenv -e .env.local -- npx tsx scripts/scan-watch-keywords.ts
// 처음 실행하면 최신 회의록 위치만 기록하고, 그 이후 공개된 회의록부터 알림을 보낸다.
import { scanWatchKeywords } from "../src/lib/watch";

scanWatchKeywords()
  .then((r) => console.log(`새 회의록 ${r.newMinutes}건 확인, 알림 ${r.notified}건, 기준 회의록 uid ${r.lastUid}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
