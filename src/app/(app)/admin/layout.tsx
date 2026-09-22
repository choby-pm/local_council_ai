import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/member";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const member = await getCurrentMember();
  if (!member || member.role !== "master") redirect("/");

  return <>{children}</>;
}
