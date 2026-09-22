"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ErrorDoc = {
  id: string;
  title: string;
  type: string;
  detectedAt: string;
  reason: string;
  queued: boolean;
};

const initialDocs: ErrorDoc[] = [
  { id: "e1", title: "OO시 지방보조금 관리 조례 일부개정조례안", type: "조례", detectedAt: "2026-09-20 03:22", reason: "원문 파싱 실패(표 구조)", queued: true },
  { id: "e2", title: "제313회 임시회 상임위 회의록", type: "회의록", detectedAt: "2026-09-15 04:10", reason: "문서 인코딩 오류", queued: false },
  { id: "e3", title: "2026년도 세입세출 예산서 일부", type: "예산서", detectedAt: "2026-09-01 04:32", reason: "항목 매핑 실패", queued: true },
];

export default function AdminErrorsPage() {
  const [docs, setDocs] = useState(initialDocs);

  function toggleQueue(id: string) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, queued: !d.queued } : d)));
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">오류·재처리 큐</h1>
          <p className="text-sm text-muted-foreground">
            관리자 전용 — &quot;오류&quot; 상태 문서는 검색 결과에서 자동 제외됩니다
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">오류 문서 {docs.length}건</CardTitle>
          <CardDescription>재처리 큐에 등록하면 다음 배치 시 재시도합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>문서</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>발생 시각</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead className="text-right">재처리 큐</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-xs truncate font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.detectedAt}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.reason}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={doc.queued ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleQueue(doc.id)}
                      >
                        {doc.queued ? "등록됨 · 해제" : "큐에 등록"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
