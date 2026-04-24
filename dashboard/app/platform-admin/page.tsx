import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import { normalizeRole } from "../../lib/rbac";
import PlatformAdminClient from "./PlatformAdminClient";

export default async function PlatformAdminPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login?returnTo=/platform-admin");
  }

  const role = normalizeRole(session);
  if (role !== "super_admin") {
    redirect(role === "staff" ? "/staff-reporting" : "/dashboard");
  }

  return <PlatformAdminClient />;
}
