import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100+
  tone?: "brand" | "success" | "warning" | "danger";
}

const toneClass: Record<NonNullable<ProgressProps["tone"]>, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

function Progress({ value, tone = "brand", className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)} {...props}>
      <div
        className={cn("h-full rounded-full transition-all", toneClass[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
