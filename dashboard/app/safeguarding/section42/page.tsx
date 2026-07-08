import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import Section42Client from "./Section42Client";

export default async function Section42Page() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/safeguarding/section42");
  return <Section42Client />;
}
