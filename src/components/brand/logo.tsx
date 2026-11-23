import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
  rounded?: boolean;
}

export function LogoMark({ size = 40, className, rounded = true }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="NIAGARA"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="niagara-mark-gradient" x1="8" y1="8" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#65C9AE" />
          <stop offset="1" stopColor="#168F82" />
        </linearGradient>
      </defs>
      {rounded ? <rect width="40" height="40" rx="11" fill="#0E3132" /> : null}
      <path
        d="M11 28.5V12.9c0-1.35 1.68-1.98 2.55-.96l12.9 15.1c.87 1.02 2.55.39 2.55-.96V11"
        stroke="url(#niagara-mark-gradient)"
        strokeWidth="3.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 32.2c3.9-2.1 6.9-2.1 10.8 0s6.9 2.1 10.8 0"
        stroke="#2F7472"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
  tone?: "default" | "inverse";
}

export function Logo({
  size = 38,
  className,
  showWordmark = true,
  subtitle = "ERP",
  tone = "default",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[15px] font-semibold tracking-[0.22em]",
              tone === "inverse" ? "text-white" : "text-foreground",
            )}
          >
            NIAGARA
          </span>
          <span
            className={cn(
              "mt-1 text-[9px] font-semibold tracking-[0.42em]",
              tone === "inverse" ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        </div>
      ) : null}
    </div>
  );
}
