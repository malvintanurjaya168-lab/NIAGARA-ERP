import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  OWNER: "border-primary/20 bg-primary/10 text-primary",
  MANAGER: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700",
  INVENTORY_STAFF: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  CASHIER: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  FINANCE: "border-violet-500/20 bg-violet-500/10 text-violet-700",
};

export function RoleBadge({
  role,
  className,
}: {
  role: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium",
        TONES[role] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {ROLE_LABELS[role as Role] ?? role}
    </Badge>
  );
}
