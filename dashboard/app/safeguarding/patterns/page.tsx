import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import PatternsClient from "./PatternsClient";

export default async function PatternsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/safeguarding/patterns");
  return <PatternsClient />;
}
