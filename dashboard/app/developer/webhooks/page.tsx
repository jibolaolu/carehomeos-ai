import type { Metadata } from "next";
import WebhookConfig from "../../../components/WebhookConfig";

export const metadata: Metadata = {
  title: "Webhooks — CareHomeOS Developer",
};

export default function WebhooksPage() {
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
