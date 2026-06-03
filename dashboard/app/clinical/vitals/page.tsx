import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import VitalsClient from "./VitalsClient";

export default async function VitalsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/clinical/vitals");
  return <VitalsClient />;
}
