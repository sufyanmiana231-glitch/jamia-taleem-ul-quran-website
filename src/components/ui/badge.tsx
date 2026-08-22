import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", {
  variants: {
    variant: {
      default: "bg-surface-muted text-foreground ring-black/5",
      brand: "bg-brand-soft text-brand ring-brand/15",
      success: "bg-success-soft text-success ring-success/15",
      warning: "bg-warning-soft text-warning ring-warning/15",
      danger: "bg-danger-soft text-danger ring-danger/15",
      info: "bg-info-soft text-info ring-info/15",
      gold: "bg-gold-soft text-gold ring-gold/15",
      outline: "border border-border text-foreground ring-0",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
