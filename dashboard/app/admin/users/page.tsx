import { redirect } from "next/navigation";
import { getAuthSession } from "../../../lib/auth-session";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/admin/users");
  if (session.role !== "super_admin") redirect("/dashboard");
  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Care home admins</p>
          <h2 className="pageTitle">Create admin users for end-to-end testing</h2>
          <p className="pageLead">Seed a care home admin or super admin, then test the local login response and role-based dashboard routes against the backend API.</p>
        </div>
      </div>
      <AdminUsersClient />
    </div>
  );
}
