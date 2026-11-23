import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  variant?: "number" | "idr" | "idr-compact";
  icon: React.ReactNode;
  hint?: string;
  trend?: number;
  tone?: "default" | "positive" | "warning" | "danger";
  className?: string;
}

const toneStyles = {
  default: "bg-primary/8 text-primary",
  positive: "bg-emerald-500/10 text-emerald-700",
  warning: "bg-amber-500/10 text-amber-700",
  danger: "bg-rose-500/10 text-rose-700",
};

export function MetricCard({
  label,
  value,
  variant = "number",
  icon,
  hint,
  trend,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/80 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-float",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-primary/[0.04] blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg",
              toneStyles[tone],
            )}
          >
            {icon}
          </span>
        </div>
        <p className="mt-3 text-[22px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
          <AnimatedNumber value={value} variant={variant} />
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          {typeof trend === "number" ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium",
                trend >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {trend >= 0 ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </span>
          ) : null}
          {hint ? (
            <p className="truncate text-[10.5px] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
