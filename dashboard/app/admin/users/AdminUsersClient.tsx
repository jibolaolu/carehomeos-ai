"use client";

import { FormEvent, useMemo, useState } from "react";
import { careHomes, demoUsers } from "../../../lib/demo-data";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  home: string;
  status: string;
  password: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8105/api/v1";

export default function AdminUsersClient() {
  const [users, setUsers] = useState<DemoUser[]>(demoUsers);
  const [name, setName] = useState("New Care Home Admin");
  const [email, setEmail] = useState("admin.demo@oakfield.local");
  const [role, setRole] = useState("care_home_admin");
  const [careHomeId, setCareHomeId] = useState("home-oakfield");
  const [message, setMessage] = useState("Seeded demo password for all local users is CareHomeOS!2026.");

  const selectedHome = useMemo(() => careHomes.find((home) => home.id === careHomeId), [careHomeId]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Creating demo user...");
    try {
      const response = await fetch(`${apiBase}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          admin_level: role === "sub_admin" ? "assistant_manager" : role === "care_home_admin" ? "registered_manager" : null,
          care_home_id: role === "super_admin" ? null : careHomeId,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const created = await response.json();
      setUsers((current) => [
        ...current,
        {
          id: created.id,
          name: created.name,
          email: created.email,
          role: created.role,
          home: created.role === "super_admin" ? "All homes" : selectedHome?.name ?? "Oakfield House",
          status: "Invited",
          password: created.password,
        },
      ]);
      setMessage(`Created ${created.email}. Use password ${created.password} for the local E2E login test.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create demo user.");
    }
  }

  return (
    <div className="stack">
      <section className="hero">
        <form className="formGrid" onSubmit={createUser}>
          <div className="field">
            <label htmlFor="admin-name">Name</label>
            <input id="admin-name" className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="admin-email">Email</label>
            <input id="admin-email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="admin-role">Role</label>
            <select id="admin-role" className="select" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="care_home_admin">Care home admin</option>
              <option value="sub_admin">Sub admin / assistant manager</option>
              <option value="staff">Staff reporting</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="admin-home">Care home</label>
            <select id="admin-home" className="select" value={careHomeId} onChange={(event) => setCareHomeId(event.target.value)} disabled={role === "super_admin"}>
              {careHomes.map((home) => <option key={home.id} value={home.id}>{home.name}</option>)}
            </select>
          </div>
          <button className="btn primary" type="submit">Create user</button>
        </form>
        <div className="notice">
          <strong>End-to-end test account</strong>
          <p>{message}</p>
        </div>
      </section>

      <section className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Care home scope</th>
              <th>Status</th>
              <th>Demo password</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong><br /><span className="muted">{user.email}</span></td>
                <td><span className="badge">{user.role.replaceAll("_", " ")}</span></td>
                <td>{user.home}</td>
                <td><span className={user.status === "Active" ? "badge success" : "badge warning"}>{user.status}</span></td>
                <td><code>{user.password}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
