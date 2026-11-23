"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { formatIDR, formatIDRCompact, formatNumber } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  variant?: "number" | "idr" | "idr-compact";
  className?: string;
  duration?: number;
}

const formatters = {
  number: formatNumber,
  idr: formatIDR,
  "idr-compact": formatIDRCompact,
};

export function AnimatedNumber({
  value,
  variant = "number",
  className,
  duration = 0.8,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const format = formatters[variant];

  useEffect(() => {
    if (reduceMotion) return;

    const controls = animate(display, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion, duration]);

  return <span className={className}>{format(reduceMotion ? value : display)}</span>;
}
