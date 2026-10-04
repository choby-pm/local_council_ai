import { redirect } from "next/navigation";

import { getActiveMember } from "@/lib/member";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const member = await getActiveMember();
  if (!member || member.role !== "master") redirect("/");

  return <>{children}</>;
}
