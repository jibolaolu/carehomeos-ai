"use client";

import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function ChartCard({ title, subtitle, children, action }: ChartCardProps) {
  return (
    <div className="card chartCard">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 className="sectionTitle" style={{ margin: 0 }}>{title}</h3>
          {subtitle ? <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>{subtitle}</p> : null}
        </div>
        {action ? <div className="actions">{action}</div> : null}
      </div>
      <div style={{ minHeight: 200, marginTop: 12 }}>{children}</div>
    </div>
  );
}
