import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 메뉴 통합(2026-10-05)으로 없어진 주소 — 알림·북마크 링크가 깨지지 않도록 옮겨 준다.
  // 예산·보고서 등은 다음 버전에서 다시 만들 수 있어 영구(308) 대신 임시 이동으로 둔다.
  async redirects() {
    return [
      { source: "/laws", destination: "/assistant", permanent: false },
      { source: "/meetings", destination: "/assistant", permanent: false },
      { source: "/budget", destination: "/assistant", permanent: false },
      { source: "/reports", destination: "/", permanent: false },
      { source: "/mypage/history", destination: "/mypage/account", permanent: false },
      { source: "/mypage/saved", destination: "/mypage/account", permanent: false },
      { source: "/admin/:path(accounts|batches|errors)", destination: "/admin/approvals", permanent: false },
      { source: "/onboarding/activity-intro", destination: "/", permanent: false },
      // 행정사무감사 준비 화면은 AI 비서의 추천 질문으로 합쳐짐 (D-25)
      { source: "/audit", destination: "/assistant", permanent: false },
    ];
  },
};

export default nextConfig;
