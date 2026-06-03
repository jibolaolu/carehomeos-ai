import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAuthSession } from "../../../lib/auth-session";

export const metadata: Metadata = {
  title: "API Documentation — CareHomeOS Developer",
};

const ENDPOINTS = [
  { method: "GET", path: "/residents", description: "List residents" },
  { method: "POST", path: "/residents", description: "Create a resident" },
  { method: "GET", path: "/residents/{id}", description: "Get a resident" },
  { method: "PATCH", path: "/residents/{id}", description: "Update a resident" },
  { method: "GET", path: "/staff", description: "List staff" },
  { method: "GET", path: "/incidents", description: "List incidents" },
  { method: "POST", path: "/incidents", description: "Create an incident" },
  { method: "GET", path: "/mar", description: "List MAR entries" },
  { method: "GET", path: "/clinical/wounds", description: "List wound assessments" },
  { method: "POST", path: "/clinical/wounds", description: "Create wound assessment" },
  { method: "GET", path: "/clinical/vitals", description: "List vital signs" },
  { method: "POST", path: "/clinical/vitals", description: "Record vital signs" },
  { method: "GET", path: "/clinical/fluids", description: "List fluid entries" },
  { method: "POST", path: "/clinical/fluids", description: "Record fluid entry" },
  { method: "POST", path: "/reports/run", description: "Run a report" },
  { method: "POST", path: "/reports/export", description: "Export a report" },
];

export default async function ApiDocsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/developer/docs");
  if (session.role !== "super_admin") redirect("/dashboard");
  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">API documentation</h1>
          <p className="pageLead">OpenAPI-compatible REST API for CareHomeOS.</p>
        </div>
      </div>

      <div className="card">
        <h3 className="sectionTitle">Authentication</h3>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          All requests must include a Bearer token in the <code>Authorization</code> header.
        </p>
        <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 12, overflow: "auto" }}>
{`curl https://api.carehomeos.local/residents \\
  -H "Authorization: Bearer {token}" \\
  -H "Accept: application/json"`}
        </pre>
      </div>

      <div className="card">
        <h3 className="sectionTitle">Endpoints</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep) => (
                <tr key={ep.method + ep.path}>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background:
                          ep.method === "GET"
                            ? "#dbeafe"
                            : ep.method === "POST"
                              ? "#d8f5e3"
                              : ep.method === "PATCH"
                                ? "#fef3c7"
                                : "#f1f5f9",
                        color: "#0f172a",
                      }}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{ep.path}</td>
                  <td>{ep.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="sectionTitle">Code examples</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <details>
            <summary style={{ fontSize: 13, fontWeight: 700, cursor: "pointer" }}>JavaScript / TypeScript</summary>
            <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 12, overflow: "auto", marginTop: 8 }}>
{`const res = await fetch("https://api.carehomeos.local/residents", {
  headers: { Authorization: \`Bearer \${token}\` },
});
const data = await res.json();`}
            </pre>
          </details>
          <details>
            <summary style={{ fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Python</summary>
            <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 12, overflow: "auto", marginTop: 8 }}>
{`import requests

headers = {"Authorization": f"Bearer {token}"}
resp = requests.get("https://api.carehomeos.local/residents", headers=headers)
data = resp.json()`}
            </pre>
          </details>
          <details>
            <summary style={{ fontSize: 13, fontWeight: 700, cursor: "pointer" }}>cURL</summary>
            <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 12, overflow: "auto", marginTop: 8 }}>
{`curl -X GET "https://api.carehomeos.local/residents" \\
  -H "Authorization: Bearer {token}"`}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
