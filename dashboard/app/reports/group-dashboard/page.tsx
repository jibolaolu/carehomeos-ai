import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import GroupDashboardClient from "./GroupDashboardClient";

export default async function GroupDashboardPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/reports/group-dashboard");
  if (session.role !== "super_admin") redirect("/dashboard");
  return <GroupDashboardClient />;
}
