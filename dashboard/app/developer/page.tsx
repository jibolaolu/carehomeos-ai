import type { Metadata } from "next";
import ApiKeyManager from "../../components/ApiKeyManager";
import ChartCard from "../../components/ChartCard";
import MetricTile from "../../components/MetricTile";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const metadata: Metadata = {
  title: "Developer Portal — CareHomeOS",
};

const usageData = [
  { day: "Mon", requests: 1240 },
  { day: "Tue", requests: 1580 },
  { day: "Wed", requests: 1420 },
  { day: "Thu", requests: 1890 },
  { day: "Fri", requests: 2100 },
  { day: "Sat", requests: 980 },
  { day: "Sun", requests: 860 },
];

export default function DeveloperPage() {
  return (
    <div className="stack">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Developer portal</h1>
          <p className="pageLead">Manage API keys, monitor usage, and integrate with CareHomeOS.</p>
        </div>
      </div>

      <div className="metrics">
        <MetricTile value="10,070" label="Requests this week" trend={{ direction: "up", value: "12%" }} iconTone="blue" />
        <MetricTile value="99.97%" label="Uptime" trend={{ direction: "flat", value: "0.00%" }} iconTone="green" />
        <MetricTile value="142ms" label="Avg latency" trend={{ direction: "down", value: "8ms" }} iconTone="purple" />
        <MetricTile value="2" label="Active keys" iconTone="yellow" />
      </div>

      <div className="chartGrid">
        <ChartCard title="API requests" subtitle="Daily volume over the last 7 days">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--card-border)" }} />
              <Bar dataKey="requests" fill="var(--brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="card">
          <h3 className="sectionTitle">Quick start</h3>
          <ol style={{ paddingLeft: 18, display: "grid", gap: 10, fontSize: 13, lineHeight: 1.6 }}>
            <li>Create an API key below and copy the token.</li>
            <li>Include the token in the <code>Authorization: Bearer {'<token>'}</code> header.</li>
            <li>Explore endpoints at <a href="/developer/docs" style={{ color: "var(--brand)" }}>API docs</a>.</li>
            <li>Configure <a href="/developer/webhooks" style={{ color: "var(--brand)" }}>webhooks</a> for real-time events.</li>
          </ol>
        </div>
      </div>

      <ApiKeyManager />
    </div>
  );
}
