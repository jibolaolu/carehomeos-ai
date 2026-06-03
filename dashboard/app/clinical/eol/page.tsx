import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import EolClient from "./EolClient";

export default async function EolPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/clinical/eol");
  return <EolClient />;
}
