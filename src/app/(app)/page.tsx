import Link from "next/link";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { ArrowUpRight, Calendar, ClipboardList, FileText } from "lucide-react";

import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getActiveMember, type Member } from "@/lib/member";

import { DashboardAsk } from "./dashboard-ask";

const NEWS_LIMIT = 3;

type NewsItem = { id: string; title: string; meta: string; excerpt: string | null };

async function getDocumentNews(
  member: Member,
  types: ("law" | "ordinance" | "meeting" | "budget")[]
): Promise<NewsItem[]> {
  const rows = await getDb()
    .select({
      id: documents.id,
      title: documents.title,
      sourceMeta: documents.sourceMeta,
      // 문서의 첫 청크를 미리보기로 사용.
      // ${documents.id}로 쓰면 drizzle이 단일 테이블 쿼리에서 "id"로만 출력해 서브쿼리 안에서 c.id로 해석됨 → 테이블명 명시
      excerpt: sql<string | null>`(
        select c.content from document_chunks c
        where c.document_id = "documents"."id"
        order by c.created_at limit 1
      )`,
    })
    .from(documents)
    .where(
      and(
        inArray(documents.type, types),
        or(isNull(documents.council), eq(documents.council, member.council))
      )
    )
    // sourceMeta.date는 "YYYY-MM-DD ..." 형식이라 문자열 정렬 = 날짜 정렬
    .orderBy(sql`${documents.sourceMeta}->>'date' desc nulls last`, desc(documents.createdAt))
    .limit(NEWS_LIMIT);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    meta: r.sourceMeta ? [r.sourceMeta.source, r.sourceMeta.date].filter(Boolean).join(" · ") : "",
    excerpt: r.excerpt,
  }));
}

export default async function DashboardPage() {
  const member = await getActiveMember();
  // (app) 레이아웃이 비활성 회원을 리다이렉트하지만, 페이지는 레이아웃과 병렬 렌더링되므로 여기서도 확인
  if (!member) return null;

  const [agendaNews, meetingNews] = await Promise.all([
    getDocumentNews(member, ["ordinance"]),
    getDocumentNews(member, ["meeting", "budget"]),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">안녕하세요, {member.name} 의원님</h1>
        <p className="text-sm text-muted-foreground">
          오늘 확인이 필요한 소식과 행정사무감사 준비 현황을 정리했습니다.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">행정사무감사 준비</p>
          <p className="text-xs text-muted-foreground">
            {member.committee
              ? `${member.committee} 소관 부서의 작년 지적사항 중 다시 물어볼 만한 질의 후보를 정리했습니다.`
              : "마이페이지에서 소속 상임위를 고르면 위원회에 맞춘 질의 후보를 정리해 드립니다."}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href={member.committee ? "/assistant" : "/mypage/account"}>
            {member.committee ? "AI 비서에서 보기" : "상임위 선택하기"}
            <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NewsCard
          icon={FileText}
          title="안건 소식"
          description={`${member.council} 최근 처리·등록된 조례안`}
          items={agendaNews}
          emptyText="아직 등록된 조례안이 없습니다"
        />
        <NewsCard
          icon={Calendar}
          title="회의록 소식"
          description="새로 공개된 회의록"
          items={meetingNews}
          emptyText="아직 공개된 회의록이 없습니다"
        />
      </div>

      <div className="flex-1" />

      <DashboardAsk />
    </div>
  );
}

function NewsCard({
  icon: Icon,
  title,
  description,
  items,
  emptyText,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  items: NewsItem[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        )}
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <Separator className="mb-4" />}
            <Link
              href={`/documents/${item.id}`}
              className="-m-1 block rounded-md p-1 transition-colors hover:bg-muted/50"
            >
              <p className="text-sm font-medium">{item.title}</p>
              {item.excerpt && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.excerpt}</p>
              )}
              {item.meta && (
                <Badge variant="outline" className="mt-2 font-normal text-muted-foreground">
                  {item.meta}
                </Badge>
              )}
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
