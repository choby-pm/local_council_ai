"use client";

import { useState } from "react";
import { Check, Copy, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ExportSource = { index: number; title: string; meta: string; sourceUrl: string | null };

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function withSources(text: string, sources: ExportSource[]) {
  if (sources.length === 0) return text;
  const list = sources
    .map((s) => `[${s.index}] ${s.title}${s.meta ? ` · ${s.meta}` : ""}${s.sourceUrl ? ` (${s.sourceUrl})` : ""}`)
    .join("\n");
  return `${text}\n\n출처\n${list}`;
}

/**
 * 답변을 복사하거나 Word 문서로 받는다. 의원은 질의서를 한글·워드 문서로 제출하므로,
 * 별도 라이브러리 없이 Word가 여는 HTML 문서(.doc)로 내려준다 (한글에서도 열림).
 */
export function MessageExport({ text, sources }: { text: string; sources: ExportSource[] }) {
  const [copied, setCopied] = useState(false);
  const full = withSources(text, sources);

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 조용히 실패 — 문서로 받기를 쓰면 됨
    }
  }

  function download() {
    const body = escapeHtml(full)
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("\n");
    const html =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">` +
      `<head><meta charset="utf-8"><title>의정 자료</title>` +
      `<style>body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:11pt;line-height:1.6}</style></head>` +
      `<body>${body}</body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `의정자료_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "복사됨" : "복사"}
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={download}>
        <FileDown className="size-3.5" />
        문서로 받기
      </Button>
    </div>
  );
}
