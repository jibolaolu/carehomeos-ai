import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import EvidencePacksClient from "./EvidencePacksClient";

export default async function EvidencePacksPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/safeguarding/evidence-packs");
  return <EvidencePacksClient />;
}
