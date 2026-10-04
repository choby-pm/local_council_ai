// 고양특례시의회 홈페이지의 현역 의원 명단(위원회별·선거구별)을 council_members에 동기화한다.
//
// 사용법: npx dotenv -e .env.local -- npx tsx scripts/sync-council-members.ts
//
// 위원회별 페이지에서 의원이 속한 위원회를, 선거구별 페이지에서 선거구가 맡는 동 목록을 가져와
// 의원 개인 홈페이지 코드(/member/{code}/main.do) 기준으로 합친다.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, notInArray } from "drizzle-orm";

import * as schema from "../src/db/schema";

const BASE = "https://www.goyangcouncil.go.kr";
const COUNCIL = "고양특례시의회";
const UA = "Mozilla/5.0 (compatible; local-council-ai/0.1)";

const COMMITTEES: Record<string, string> = {
  C101: "의회운영위원회",
  C401: "기획행정위원회",
  C602: "환경경제위원회",
  C801: "건설교통위원회",
  C901: "문화복지위원회",
};

type Card = { name: string; position: string | null; district: string | null; homepageCode: string };

async function fetchHtml(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.text();
}

function field(card: string, label: RegExp) {
  const m = card.match(new RegExp(`<em>${label.source}</em>\\s*<span class="colon">:</span>\\s*<span>([^<]*)</span>`));
  return m ? m[1].trim() || null : null;
}

// 의원 카드: <div class="profile"> (사진이 없으면 "profile none") … <strong>이름</strong> … 직위/선거구 … /member/{code}/main.do
function parseCards(html: string): Card[] {
  const cards: Card[] = [];
  for (const block of html.split(/<div class="profile[^"]*">/).slice(1)) {
    const name = block.match(/<strong>([^<]+)<\/strong>/)?.[1].trim();
    const code = block.match(/\/member\/(\d+)\/main\.do/)?.[1];
    if (!name || !code) continue;
    cards.push({
      name,
      position: field(block, /직\s*위/),
      district: field(block, /선\s*거\s*구/),
      homepageCode: code,
    });
  }
  return cards;
}

// "가선거구 : 주교동, 성사1동, 성사2동, 식사동" 형태의 안내 문구에서 선거구별 동 목록을 만든다
function parseDistrictAreas(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const areas = new Map<string, string[]>();
  for (const m of text.matchAll(/([가-힣]선거구)\s*:\s*([가-힣0-9]+동(?:\s*,\s*[가-힣0-9]+동)*)/g)) {
    if (!areas.has(m[1])) areas.set(m[1], m[2].split(",").map((s) => s.trim()));
  }
  return areas;
}

async function main() {
  const byCode = new Map<string, Card & { committees: string[] }>();

  for (const [code, committee] of Object.entries(COMMITTEES)) {
    const cards = parseCards(await fetchHtml(`/kr/member/committee.do?cmt_sch=${code}`));
    for (const card of cards) {
      const entry = byCode.get(card.homepageCode) ?? { ...card, committees: [] };
      entry.committees.push(committee);
      // 위원장·부위원장 직위는 해당 위원회 페이지에서만 보이므로, 일반 "의원"보다 구체적인 값을 남긴다
      if (card.position && card.position !== "의원") entry.position = card.position;
      byCode.set(card.homepageCode, entry);
    }
    console.log(`${committee}: ${cards.length}명`);
  }

  const districtHtml = await fetchHtml("/kr/member/district.do");
  const areas = parseDistrictAreas(districtHtml);
  // 위원회에 속하지 않은 의원(의장 등)도 선거구별 페이지에는 있으므로 함께 반영
  for (const card of parseCards(districtHtml)) {
    const entry = byCode.get(card.homepageCode) ?? { ...card, committees: [] };
    entry.district ??= card.district;
    if (!entry.position || entry.position === "의원") entry.position = card.position;
    byCode.set(card.homepageCode, entry);
  }

  const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
  const now = new Date();
  for (const m of byCode.values()) {
    const values = {
      council: COUNCIL,
      name: m.name,
      committees: m.committees,
      position: m.position,
      district: m.district,
      districtAreas: (m.district && areas.get(m.district)) || [],
      homepageCode: m.homepageCode,
      updatedAt: now,
    };
    await db
      .insert(schema.councilMembers)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.councilMembers.council, schema.councilMembers.homepageCode],
        set: values,
      });
  }

  // 임기 종료 등으로 명단에서 빠진 의원 정리 (연결된 계정은 set null)
  await db
    .delete(schema.councilMembers)
    .where(
      and(
        eq(schema.councilMembers.council, COUNCIL),
        notInArray(schema.councilMembers.homepageCode, [...byCode.keys()])
      )
    );

  console.log(`\n현역 의원 ${byCode.size}명 동기화 완료, 선거구 ${areas.size}곳`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
