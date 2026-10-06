import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-constants";

// /api/cron은 Vercel 크론이 쿠키 없이 호출한다 — 라우트에서 CRON_SECRET으로 따로 확인
const PUBLIC_PATHS = ["/login", "/signup", "/api/cron"];

// 낙관적 검사: 세션 쿠키 유무만 본다. 세션의 실제 유효성과 회원 상태는
// getCurrentMember()/getActiveMember()가 (app) 레이아웃·API 라우트에서 DB로 확인한다.
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic || req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    "/((?!_next|.*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
