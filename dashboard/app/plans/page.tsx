import { redirect } from "next/navigation";
import { createSessionSummary, getAuthSession } from "../../lib/auth-session";
import PlansClient from "./PlansClient";

export default async function PlansPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login?returnTo=/plans");
  }

  return <PlansClient initialUser={createSessionSummary(session)} />;
}
