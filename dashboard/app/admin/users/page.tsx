import AdminUsersClient from "./AdminUsersClient";

export default function AdminUsersPage() {
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
