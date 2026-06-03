import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import CQCPIRClient from "./CQCPIRClient";

export default async function CQCPIRPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/reports/cqc-pir");
  return <CQCPIRClient />;
}
