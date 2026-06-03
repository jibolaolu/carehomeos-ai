import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import CustomReportClient from "./CustomReportClient";

export default async function CustomReportPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/reports/custom");
  return <CustomReportClient />;
}
