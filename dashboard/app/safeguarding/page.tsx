import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import SafeguardingClient from "./SafeguardingClient";

export default async function SafeguardingPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/safeguarding");
  return <SafeguardingClient />;
}
