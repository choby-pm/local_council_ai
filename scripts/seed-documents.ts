import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { embed } from "ai";
import { google } from "@ai-sdk/google";

import * as schema from "../src/db/schema";
import { buildDocumentNotification } from "../src/lib/document-notifications";

const COUNCIL = "고양특례시의회";

const seedDocs: {
  type: "law" | "ordinance" | "meeting" | "budget";
  council: string | null;
  title: string;
  meta: Record<string, string>;
  content: string;
  url?: string;
}[] = [
  {
    type: "law",
    council: null,
    title: "지방자치법 제27조의2",
    meta: { source: "법률", date: "2024-01-16 시행" },
    content:
      "지방자치단체는 예산 편성 등 예산 과정에 주민을 참여하게 할 수 있다. " +
      "주민참여예산제도의 운영에 필요한 사항은 대통령령으로 정하는 범위에서 조례로 정한다.",
  },
  {
    type: "ordinance",
    council: COUNCIL,
    title: "고양시의회 의원연구단체 지원 조례 일부개정조례안",
    meta: { source: "고양특례시의회", date: "2026-09-03 부결" },
    url: "https://www.goyangcouncil.go.kr/promote/billview.do?uid=4843",
    content:
      "발의자: 고덕희 의원 외 11명. 주요 내용: 의원이 가입 가능한 연구단체를 1개에서 2개로 확대. " +
      "2026년 9월 3일 제307회 제3차 본회의에서 부결(찬성 14명, 반대 17명, 기권 1명). " +
      "반대 측(최성원 의원)은 의원들의 바쁜 일정 속 2개 연구단체 운영의 실효성 문제와 연구비 분산을 우려했고, " +
      "찬성 측(고덕희 의원)은 다른 특례시들도 2개를 허용하고 있으며 의원들의 선택권 확대가 목표라고 주장했다.",
  },
  {
    type: "ordinance",
    council: COUNCIL,
    title: "고양시 개발제한구역 내 전기자동차 충전시설 허가기준에 관한 조례안",
    meta: { source: "고양특례시의회 · 건설교통위원회", date: "2026-08-25 부결" },
    url: "https://www.goyangcouncil.go.kr/promote/billview.do?uid=4848",
    content:
      "발의자: 안중돈, 전희정 의원(2026년 8월 13일 발의). 제안이유: 개발제한구역의 훼손을 최소화하여 보전하고 " +
      "주민 생활 편익을 증진할 수 있도록 개발제한구역 내 전기자동차 충전소 설치를 위한 입지 및 기준 수립과 " +
      "행위허가 신청자 기준 등을 규정. 건설교통위원회 심사 후 2026년 8월 25일 부결.",
  },
  {
    type: "ordinance",
    council: COUNCIL,
    title: "고양시 도시계획 조례 일부개정조례안",
    meta: { source: "고양특례시의회", date: "2026-09-03 수정가결" },
    url: "https://www.goyangcouncil.go.kr/promote/billview.do?uid=4846",
    content: "발의자: 이해림 의원 외 14명. 2026년 9월 3일 제307회 제3차 본회의에서 수정가결.",
  },
  {
    type: "ordinance",
    council: COUNCIL,
    title: "고양시 시민고충처리위원회 구성 및 운영에 관한 조례 일부개정조례안",
    meta: { source: "고양특례시의회", date: "2026-09-03 원안가결" },
    url: "https://www.goyangcouncil.go.kr/promote/billview.do?uid=4845",
    content: "발의자: 김수진 의원 외 15명. 2026년 9월 3일 제307회 제3차 본회의에서 원안가결.",
  },
  {
    type: "ordinance",
    council: COUNCIL,
    title: "고양시 출자·출연 기관의 운영에 관한 조례 일부개정조례안",
    meta: { source: "고양특례시의회", date: "2026-09-03 수정가결" },
    url: "https://www.goyangcouncil.go.kr/promote/billview.do?uid=4844",
    content: "발의자: 공소자 의원 외 15명. 2026년 9월 3일 제307회 제3차 본회의에서 수정가결.",
  },
  {
    type: "meeting",
    council: COUNCIL,
    title: "제307회 제3차 본회의 회의록",
    meta: { source: "본회의", date: "2026-09-03" },
    url: "https://www.goyangcouncil.go.kr/viewer/minutes.do?uid=15624",
    content:
      "개최일시 2026년 9월 3일 10:00, 의장 김미수, 재석의원 32명. " +
      "2026년도 행정사무감사 시기 및 기간 결정의 건 가결. " +
      "의원연구단체 지원 조례 일부개정조례안 부결(찬성 14, 반대 17, 기권 1). " +
      "고양시 출자·출연 기관 운영 조례, 시민고충처리위원회 구성·운영 조례, 도시계획 조례, " +
      "공동주택관리 조례, 부동산가격공시위원회 운영 조례, 지역 돌봄 통합지원 조례 개정안 모두 가결. " +
      "교외선 운영손실 보전 협약 동의안 가결. 일산 노후계획도시 아파트7구역·16구역 특별정비계획 가결. " +
      "2026년도 제3회 추가경정예산안 가결(찬성 18, 반대 12, 기권 2) — " +
      "전희정 의원은 사회연대경제박람회 5억 원과 유출지하수 시설사업 4억 6,300만 원 예산에 대해 " +
      "충분한 정보 제공과 심의가 부족했다고 반대 의견을 밝혔다. " +
      "2026년도 제2회 기금운용계획 변경안 가결. 고양시의회윤리특별위원회 위원 9명 선임 가결. 산회 10:55.",
  },
  {
    type: "meeting",
    council: COUNCIL,
    title: "제307회 제3차 기획행정위원회 회의록",
    meta: { source: "기획행정위원회", date: "2026-09-21" },
    url: "https://www.goyangcouncil.go.kr/viewer/minutes.do?uid=15675",
    content:
      "일시 2026년 9월 21일 10:07~10:12, 위원장 김수진, 참석위원 9명(김수진, 한주연, 공소자, 김정희, 문재호, " +
      "손동숙, 신지연, 오영숙, 오우람). 2026년도 행정사무감사계획서 작성의 건(위원장 제의) 만장일치 가결. " +
      "감사기간 2026년 11월 12일~19일(8일간), 감사대상 소통협치담당관·감사관·기획조정실·자치행정국·각 구청 " +
      "자치행정과 등, 감사위원 기획행정위원회 소속 9명, 증인 출석 요구 81명.",
  },
  {
    type: "budget",
    council: COUNCIL,
    title: "제307회 제4차 예산결산특별위원회 회의록",
    meta: { source: "예산결산특별위원회", date: "2026-09-02" },
    url: "https://www.goyangcouncil.go.kr/viewer/minutes.do?uid=15663",
    content:
      "개최일시 2026년 9월 2일 11:40~17:12, 위원장 오영숙, 출석위원 9명. " +
      "2026년도 제3회 추가경정예산안 심사 — 일반회계 세입 의결액 3조 1,312억 421만 8천 원(시장 요구안 그대로). " +
      "특별회계 세입은 시장 요구 6,480억 6,099만 1천 원에서 162억 9,384만 4천 원(1건) 감액하여 " +
      "6,317억 6,714만 7천 원 의결. 일반·특별회계 세입 총액 최종 의결 3조 7,629억 7,136만 5천 원. " +
      "세출은 일반회계에서 1,420만 원을 예비비로 전환, 특별회계에서 7건 164억 1,384만 4천 원 삭감·1건 1억 2천만 원 증액. " +
      "세출 총액도 세입과 동일하게 3조 7,629억 7,136만 5천 원 의결. " +
      "사회연대경제박람회 및 국제콘퍼런스 예산과 유출지하수 이용시설 설치사업 예산을 두고 " +
      "어느 때보다 치열한 토론이 있었으나 모든 안건이 만장일치로 가결됨. " +
      "2026년도 제2회 기금운용계획 변경안도 원안대로 의결 승인.",
  },
];

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // 기존 시드(데모용 가짜 데이터) 정리 후 재적재
  await db.delete(schema.documentChunks);
  await db.delete(schema.documents);

  for (const doc of seedDocs) {
    const [row] = await db
      .insert(schema.documents)
      .values({
        type: doc.type,
        council: doc.council,
        title: doc.title,
        sourceMeta: doc.meta,
        sourceUrl: doc.url ?? null,
        status: "색인완료",
      })
      .returning();

    const { embedding } = await embed({
      model: google.textEmbeddingModel("gemini-embedding-001"),
      value: doc.content,
      providerOptions: {
        google: { outputDimensionality: 1536, taskType: "RETRIEVAL_DOCUMENT" },
      },
    });

    await db.insert(schema.documentChunks).values({
      documentId: row.id,
      content: doc.content,
      embedding,
    });

    // 문서 삭제 시 알림도 cascade로 함께 지워지므로 재적재마다 새로 생성
    await db.insert(schema.notifications).values(buildDocumentNotification(row));

    console.log(`색인 완료: [${doc.type}] ${doc.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
