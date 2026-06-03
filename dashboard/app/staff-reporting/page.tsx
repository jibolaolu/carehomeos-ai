import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import StaffReportingClient from "./StaffReportingClient";

export default async function StaffReportingPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/staff-reporting");
  return <StaffReportingClient />;
}
