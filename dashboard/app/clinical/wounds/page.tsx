import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import WoundsClient from "./WoundsClient";

export default async function WoundsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/clinical/wounds");
  return <WoundsClient />;
}
