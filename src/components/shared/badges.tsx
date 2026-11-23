import { Badge } from "@/components/ui/badge";
import { SALE_STATUS_LABELS, STOCK_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function stockStatus(stock: number, minimum: number) {
  if (stock <= 0) return STOCK_STATUS.out;
  if (stock <= minimum) return STOCK_STATUS.low;
  return STOCK_STATUS.inStock;
}

export function StockBadge({
  stock,
  minimum,
  className,
}: {
  stock: number;
  minimum: number;
  className?: string;
}) {
  const status = stockStatus(stock, minimum);
  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", status.className, className)}
    >
      {status.label}
    </Badge>
  );
}

export function SaleStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const completed = status === "COMPLETED";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium",
        completed
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
          : "border-rose-500/20 bg-rose-500/10 text-rose-700",
        className,
      )}
    >
      {SALE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
