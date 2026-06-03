import { redirect } from "next/navigation";
import { getAuthSession } from "../../lib/auth-session";
import { normalizeRole } from "../../lib/rbac";
import ShiftNotesClient from "./ShiftNotesClient";

export default async function ShiftNotesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/shift-notes");

  const role = normalizeRole(session);
  if (role === "super_admin") redirect("/platform-admin");
  if (role === "signed_out") redirect("/login?returnTo=/shift-notes");

  return (
    <ShiftNotesClient
      userName={session.name}
      userRole={session.role}
      careHomeId={session.careHomeId ?? "home-oakfield"}
    />
  );
}
