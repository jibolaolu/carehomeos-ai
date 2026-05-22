"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface MetricTileProps {
  value: string | number;
  label: string;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  icon?: ReactNode;
  iconTone?: "blue" | "green" | "yellow" | "red" | "purple";
  href?: string;
}

export default function MetricTile({
  value,
  label,
  trend,
  icon,
  iconTone = "blue",
  href,
}: MetricTileProps) {
  const content = (
    <div className="metricTile">
      <div>
        <p className="metricLabel">{label}</p>
        <p className="metricValue">{value}</p>
        {trend ? (
          <span
            className="badge"
            style={{
              marginTop: 6,
              background:
                trend.direction === "up"
                  ? "#ecfdf5"
                  : trend.direction === "down"
                    ? "#fef2f2"
                    : "#f8fafc",
              color:
                trend.direction === "up"
                  ? "var(--success)"
                  : trend.direction === "down"
                    ? "var(--danger)"
                    : "var(--muted)",
            }}
          >
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.value}
          </span>
        ) : null}
      </div>
      {icon ? <div className={`metricIcon ${iconTone}`}>{icon}</div> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="interactiveCard" style={{ textDecoration: "none", color: "inherit" }}>
        {content}
      </Link>
    );
  }

  return content;
}
