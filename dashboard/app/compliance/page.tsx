import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import ComplianceClient from "./ComplianceClient";

export default async function CompliancePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/compliance");
  return <ComplianceClient />;
}
