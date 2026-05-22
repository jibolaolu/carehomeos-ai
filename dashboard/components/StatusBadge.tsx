"use client";

import { cn } from "../lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: StatusVariant;
  className?: string;
}

const variantMap: Record<StatusVariant, string> = {
  success: "badge success",
  warning: "badge warning",
  danger: "badge danger",
  info: "badge",
  neutral: "badge",
};

export default function StatusBadge({ children, variant = "neutral", className }: StatusBadgeProps) {
  return <span className={cn(variantMap[variant], className)}>{children}</span>;
}
