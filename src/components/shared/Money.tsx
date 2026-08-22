import { formatCurrency } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn("tabular", className)}>{formatCurrency(amount)}</span>;
}
