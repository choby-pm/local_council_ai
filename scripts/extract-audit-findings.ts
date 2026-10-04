// 고양특례시의회 행정사무감사 게시판의 위원회별 결과보고서(PDF)를 Gemini로 읽어 audit_findings에 적재한다.
//
// 사용법:
//   npx dotenv -e .env.local -- npx tsx scripts/extract-audit-findings.ts <연도> [위원회] [--dry-run]
//   예) ... extract-audit-findings.ts 2025 건설교통 --dry-run   → DB 저장 없이 추출 결과만 출력
//
// 결과보고서는 HWP에서 변환된 PDF라 텍스트 레이어로 글자를 뽑을 수 없어(글꼴 매핑 없음),
// 텍스트 추출기 대신 PDF를 직접 읽는 멀티모달 모델을 쓴다. 공개 문서라 무료 티어로 보내도 무방.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import * as schema from "../src/db/schema";

const BASE = "https://www.goyangcouncil.go.kr";
const COUNCIL = "고양특례시의회";
const EXTRACT_MODEL = "gemini-3.6-flash";
const UA = "Mozilla/5.0 (compatible; local-council-ai/0.1)";
const MAX_LIST_PAGES = 8;

type ReportPost = { committee: string; year: number; title: string; viewUrl: string };

const findingsSchema = z.object({
  findings: z.array(
    z.object({
      department: z.string().describe("피감사 부서명 (보고서 표기 그대로, 예: 도로정책과)"),
      project: z.string().nullable().describe("지적 대상 사업·업무명. 부서 전반에 대한 지적이면 null"),
      // nullable로 두면 실행에 따라 전부 null로 비우는 경우가 있어 필수로 받는다
      actionType: z
        .string()
        .describe("조치 구분. 보고서의 분류 제목 표기 그대로(예: 시정요구, 처리요구, 건의사항). 분류가 전혀 없으면 '구분없음'"),
      finding: z.string().describe("지적 내용. 보고서 문장을 최대한 그대로, 필요하면 2~3문장으로 줄임"),
      request: z.string().nullable().describe("집행부에 요구한 조치 내용. 없으면 null"),
      page: z.number().int().nullable().describe("이 지적이 나오는 PDF 쪽 번호(1부터)"),
    })
  ),
});

function decodeHtml(s: string) {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function fetchText(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init?.headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { text: await res.text(), cookies: res.headers.getSetCookie().map((c) => c.split(";")[0]) };
}

async function findReportPosts(year: number, committee?: string): Promise<ReportPost[]> {
  const posts: ReportPost[] = [];
  const titlePattern = /[［\[]([^］\]]+)[］\]]\s*(\d{4})년도\s*행정사무감사\s*결과보고서/;

  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const { text } = await fetchText(`${BASE}/kr/auditBBS.do?page=${page}`);
    const links = [...text.matchAll(/href="(\/kr\/auditBBSview\.do\?uid=[0-9A-F]+)[^"]*"\s+title="([^"]+?) 상세보기"/g)];
    if (links.length === 0) break;

    for (const [, path, rawTitle] of links) {
      const title = decodeHtml(rawTitle).trim();
      const m = title.match(titlePattern);
      if (!m || Number(m[2]) !== year) continue;
      const name = `${m[1].trim()}위원회`;
      if (committee && !name.startsWith(committee)) continue;
      posts.push({ committee: name, year, title, viewUrl: `${BASE}${path}` });
    }
  }
  return posts;
}

// 첨부 뷰어(/viewer/pdf.do)는 pdf.js 껍데기라, 실제 파일 경로는 loadFile.do에 AJAX로 물어봐야 한다.
// AJAX 헤더·세션 쿠키·Referer가 없으면 "잘못된 접근입니다" HTML이 돌아온다.
async function downloadReportPdf(post: ReportPost) {
  const { text: viewHtml } = await fetchText(post.viewUrl);
  const attach = viewHtml.match(/\/viewer\/pdf\.do\?group=bbs&uid=(\d+)/);
  if (!attach) throw new Error(`첨부 PDF를 찾지 못함: ${post.title}`);

  const viewerUrl = `${BASE}/viewer/pdf.do?group=bbs&uid=${attach[1]}`;
  const { cookies } = await fetchText(viewerUrl);
  const { text: json } = await fetchText(`${BASE}/viewer/pdf/loadFile.do`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: viewerUrl,
      Cookie: cookies.join("; "),
    },
    body: `group=bbs&uid=${attach[1]}`,
  });
  const { result, file } = JSON.parse(json) as { result: boolean; file?: string };
  if (!result || !file) throw new Error(`PDF 경로 조회 실패: ${post.title}`);

  const res = await fetch(`${BASE}${file}`, { headers: { "User-Agent": UA, Cookie: cookies.join("; ") } });
  if (!res.ok) throw new Error(`PDF 다운로드 실패 ${res.status}: ${post.title}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function extractFindings(post: ReportPost, pdf: Uint8Array) {
  const { output } = await generateText({
    model: google(EXTRACT_MODEL),
    output: Output.object({ schema: findingsSchema }),
    // 무료 티어는 503(high demand)이 잦지만, 재시도도 하루 요청 한도(모델당 20회)를 소모하므로 2회까지만
    maxRetries: 2,
    // 같은 보고서를 다시 돌려도 결과가 흔들리지 않도록
    temperature: 0,
    system:
      "당신은 지방의회 행정사무감사 결과보고서에서 지적사항을 빠짐없이 뽑아 정리하는 도우미입니다. " +
      "보고서에 실제로 적힌 내용만 옮기고, 없는 부서·사업·요구를 지어내지 마세요. " +
      "감사 개요, 위원 명단, 일정 같은 지적사항이 아닌 부분은 제외하세요.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `${post.title} 문서입니다. 피감사 부서별 지적사항(시정·처리요구, 건의사항 등)을 모두 추출하세요. ` +
              "한 부서에 지적이 여러 개면 각각 별도 항목으로 나누세요.",
          },
          { type: "file", mediaType: "application/pdf", data: pdf, filename: `${post.committee}-${post.year}.pdf` },
        ],
      },
    ],
  });
  return output.findings;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const [yearArg, committee] = args.filter((a) => !a.startsWith("--"));
  const year = Number(yearArg);
  if (!Number.isInteger(year)) {
    console.error("사용법: ... extract-audit-findings.ts <연도> [위원회] [--dry-run]");
    process.exit(1);
  }

  const posts = await findReportPosts(year, committee);
  if (posts.length === 0) {
    console.error(`${year}년도 행정사무감사 결과보고서를 찾지 못했습니다${committee ? ` (${committee})` : ""}.`);
    process.exit(1);
  }

  const db = dryRun ? null : drizzle(neon(process.env.DATABASE_URL!), { schema });

  for (const post of posts) {
    console.log(`\n▶ ${post.title}`);
    const pdf = await downloadReportPdf(post);
    console.log(`  PDF ${(pdf.byteLength / 1024).toFixed(0)}KB, ${EXTRACT_MODEL}로 추출 중…`);
    const findings = await extractFindings(post, pdf);

    const byDept = new Map<string, number>();
    for (const f of findings) byDept.set(f.department, (byDept.get(f.department) ?? 0) + 1);
    console.log(`  지적사항 ${findings.length}건, 부서 ${byDept.size}곳`);
    for (const [dept, n] of byDept) console.log(`   - ${dept}: ${n}건`);

    if (dryRun) {
      console.log(JSON.stringify(findings, null, 2));
      continue;
    }

    // 같은 보고서를 다시 돌리면 이전 추출분을 지우고 새로 넣는다
    await db!.delete(schema.auditFindings).where(eq(schema.auditFindings.sourceUrl, post.viewUrl));
    if (findings.length > 0) {
      await db!.insert(schema.auditFindings).values(
        findings.map((f) => ({
          council: COUNCIL,
          year: post.year,
          committee: post.committee,
          department: f.department.trim(),
          project: f.project?.trim() || null,
          actionType: f.actionType.trim() === "구분없음" ? null : f.actionType.trim(),
          finding: f.finding.trim(),
          request: f.request?.trim() || null,
          page: f.page,
          sourceTitle: post.title,
          sourceUrl: post.viewUrl,
        }))
      );
    }
    console.log("  저장 완료");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
