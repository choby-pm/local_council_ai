import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ExternalLink, FileText } from "lucide-react";

import { getDb } from "@/db";
import { documentChunks, documents } from "@/db/schema";
import { getCurrentMember } from "@/lib/member";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const typeLabel: Record<string, string> = {
  law: "법률·시행령",
  ordinance: "조례",
  meeting: "회의록",
  budget: "예산·결산",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) notFound();

  const { id } = await params;
  const db = getDb();

  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) notFound();
  // 의회별 테넌시 격리: 전국공통(council=null) 또는 본인 소속 의회 문서만 열람 가능
  if (doc.council && doc.council !== member.council) notFound();

  const chunks = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id))
    .orderBy(asc(documentChunks.createdAt));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-normal">
          {typeLabel[doc.type] ?? doc.type}
        </Badge>
        <Badge variant="outline" className="font-normal">
          {doc.council ?? "전국 공통"}
        </Badge>
      </div>

      <h1 className="text-xl font-semibold tracking-tight">{doc.title}</h1>

      {doc.sourceMeta && (
        <p className="text-sm text-muted-foreground">
          {Object.values(doc.sourceMeta).join(" · ")}
        </p>
      )}

      {doc.sourceUrl && (
        <Button asChild variant="outline" size="sm" className="w-fit gap-1.5">
          <Link href={doc.sourceUrl} target="_blank" rel="noopener noreferrer">
            의회 홈페이지 원본에서 보기
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            원문
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {chunks.map((c) => (
            <p key={c.id} className="text-sm leading-relaxed whitespace-pre-wrap">
              {c.content}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
