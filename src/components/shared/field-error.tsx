import { cn } from "@/lib/utils";

export function FieldError({
  messages,
  className,
}: {
  messages?: string[];
  className?: string;
}) {
  if (!messages?.length) return null;
  return (
    <p className={cn("text-[11px] font-medium text-destructive", className)}>
      {messages[0]}
    </p>
  );
}
