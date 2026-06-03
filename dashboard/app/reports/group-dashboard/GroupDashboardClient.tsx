"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getGroupDashboard, type GroupDashboardData } from "../../../lib/api-client";

export default function GroupDashboardClient() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<GroupDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGroupDashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  const kpiCards = data
    ? [
        { title: "Total Homes", value: String(data.homes_count), change: "—", trend: "up" as const },
        { title: "Total Residents", value: String(data.total_residents), change: "—", trend: "up" as const },
        { title: "Occupancy Rate", value: `${data.occupancy_rate}%`, change: "—", trend: "up" as const },
        { title: "Incidents (30d)", value: String(data.incidents_30d), change: "—", trend: "down" as const },
        { title: "Total Beds", value: String(data.total_beds), change: "—", trend: "up" as const },
        { title: "Avg NEWS2", value: (data.avg_news2_score ?? data.avg_news2) != null ? String((data.avg_news2_score ?? data.avg_news2)!.toFixed(1)) : "—", change: "—", trend: "down" as const },
      ]
    : [
        { title: "Total Homes", value: "—", change: "—", trend: "up" as const },
        { title: "Total Residents", value: "—", change: "—", trend: "up" as const },
        { title: "Occupancy Rate", value: "—", change: "—", trend: "up" as const },
        { title: "Incidents (30d)", value: "—", change: "—", trend: "down" as const },
        { title: "Staff Turnover", value: "—", change: "—", trend: "down" as const },
        { title: "CQC Readiness", value: "—", change: "—", trend: "up" as const },
      ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Group Dashboard</h1>
          <p className="text-gray-500">Cross-home performance overview</p>
          {error ? <p className="text-red-600 text-sm mt-1">{error}</p> : null}
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
              <div className={`text-sm mt-1 ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                {kpi.change} vs last period
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.homes && data.homes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Occupancy by home</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.homes.map((home) => (
                <div key={home.id} className="flex items-center gap-3">
                  <span className="w-32 text-sm font-medium">{home.name}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${home.occupancy_rate}%` }} />
                  </div>
                  <span className="text-sm text-gray-500 w-12">{home.occupancy_rate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
