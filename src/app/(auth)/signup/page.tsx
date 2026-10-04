import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/member";

import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  if (await getCurrentMember()) redirect("/");

  return <SignupForm />;
}
