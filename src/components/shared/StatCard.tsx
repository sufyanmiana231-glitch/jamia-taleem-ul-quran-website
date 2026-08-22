import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "gold" | "neutral";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  gold: "bg-gold-soft text-gold",
  neutral: "bg-surface-muted text-foreground",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  caption,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: Tone;
  caption?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="tabular mt-1.5 truncate text-xl font-bold">{value}</p>
          {caption && <p className="mt-1 truncate text-xs text-muted-foreground">{caption}</p>}
        </div>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
