"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "motion/react";
import { formatIDR, formatIDRCompact, formatShortDay } from "@/lib/format";
import type { ReportSeriesPoint } from "@/lib/queries/reports";

interface ChartPoint {
  label: string;
  revenue: number;
  profit: number;
  cogs: number;
}

export function ProfitChart({ series }: { series: ReportSeriesPoint[] }) {
  const reduceMotion = useReducedMotion();

  const data: ChartPoint[] = series.map((point) => ({
    label: formatShortDay(new Date(`${point.date}T00:00:00+07:00`)),
    revenue: point.revenue,
    profit: point.profit,
    cogs: point.cogs,
  }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />
          Pendapatan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Laba kotor
        </span>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="report-revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#168F82" stopOpacity={0.26} />
                <stop offset="100%" stopColor="#168F82" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#E4EBE8"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10.5, fill: "#71817E" }}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10.5, fill: "#71817E" }}
              tickFormatter={(value) => formatIDRCompact(Number(value))}
              width={62}
            />
            <Tooltip
              cursor={{
                stroke: "#168F82",
                strokeDasharray: "4 4",
                strokeOpacity: 0.35,
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as ChartPoint | undefined;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                    <p className="text-[10.5px] font-medium text-muted-foreground">
                      {String(label)}
                    </p>
                    <p className="mt-1 text-[11.5px] font-semibold tabular-nums">
                      Pendapatan: {formatIDR(point?.revenue ?? 0)}
                    </p>
                    <p className="text-[11px] text-emerald-600 tabular-nums">
                      Laba: {formatIDR(point?.profit ?? 0)}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground tabular-nums">
                      HPP: {formatIDR(point?.cogs ?? 0)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#168F82"
              strokeWidth={2}
              fill="url(#report-revenue)"
              dot={false}
              activeDot={{
                r: 3.5,
                fill: "#168F82",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              isAnimationActive={!reduceMotion}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#10b981"
              strokeWidth={1.8}
              dot={false}
              activeDot={{
                r: 3.5,
                fill: "#10b981",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              isAnimationActive={!reduceMotion}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
