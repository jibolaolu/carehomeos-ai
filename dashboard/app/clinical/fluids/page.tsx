import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import FluidsClient from "./FluidsClient";

export default async function FluidsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/clinical/fluids");
  return <FluidsClient />;
}
