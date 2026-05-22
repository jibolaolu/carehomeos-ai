"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface FluidDataPoint {
  time: string;
  intake: number;
  output: number;
  balance: number;
}

interface FluidBalanceChartProps {
  data: FluidDataPoint[];
  target?: number;
}

export default function FluidBalanceChart({ data, target = 1500 }: FluidBalanceChartProps) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={target}
            label={{ value: `Target ${target}ml`, position: "right", fontSize: 11, fill: "#16a34a" }}
            stroke="#16a34a"
            strokeDasharray="4 4"
          />
          <Bar dataKey="intake" fill="#2f84cc" radius={[4, 4, 0, 0]} name="Intake (ml)" />
          <Bar dataKey="output" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Output (ml)" />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#c9364d"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Running balance"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
