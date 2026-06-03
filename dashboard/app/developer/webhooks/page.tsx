import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAuthSession } from "../../../lib/auth-session";
import WebhookConfig from "../../../components/WebhookConfig";

export const metadata: Metadata = {
  title: "Webhooks — CareHomeOS Developer",
};

export default async function WebhooksPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login?returnTo=/developer/webhooks");
  if (session.role !== "super_admin") redirect("/dashboard");
  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Webhook subscriptions</h1>
          <p className="pageLead">Create, edit, and monitor webhook deliveries.</p>
        </div>
      </div>
      <WebhookConfig />
    </div>
  );
}
