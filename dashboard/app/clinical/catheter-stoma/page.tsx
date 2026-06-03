import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import CatheterStomaClient from "./CatheterStomaClient";

export default async function CatheterStomaPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/clinical/catheter-stoma");
  return <CatheterStomaClient />;
}
