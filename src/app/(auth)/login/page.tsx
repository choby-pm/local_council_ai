import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/member";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // 이미 로그인된 세션이면 "/"로 — (app) 레이아웃이 회원 상태에 맞는 화면으로 다시 분기함
  if (await getCurrentMember()) redirect("/");

  return <LoginForm />;
}
