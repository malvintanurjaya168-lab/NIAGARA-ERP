"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "motion/react";
import { Input } from "@/components/ui/input";
import { formatIDR, formatIDRCompact, formatNumber, formatShortDay } from "@/lib/format";
import type { SalesSeriesPoint } from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";

type Mode = "daily" | "weekly" | "monthly" | "custom";

const MODES: { value: Mode; label: string }[] = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
  { value: "custom", label: "Kustom" },
];

interface ChartPoint {
  label: string;
  revenue: number;
  transactions: number;
}

function keyToDate(key: string): Date {
  return new Date(`${key}T00:00:00+07:00`);
}

function monthLabel(key: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "short",
    year: "2-digit",
  }).format(new Date(`${key}-01T00:00:00+07:00`));
}

export function SalesPerformanceChart({ series }: { series: SalesSeriesPoint[] }) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("daily");
  const lastKey = series.at(-1)?.date ?? "";
  const firstKey = series[0]?.date ?? "";
  const [customFrom, setCustomFrom] = useState(
    series.at(-30)?.date ?? firstKey,
  );
  const [customTo, setCustomTo] = useState(lastKey);

  const points = useMemo<ChartPoint[]>(() => {
    if (mode === "daily") {
      return series.slice(-30).map((point) => ({
        label: formatShortDay(keyToDate(point.date)),
        revenue: point.revenue,
        transactions: point.transactions,
      }));
    }

    if (mode === "weekly") {
      const slice = series.slice(-84);
      const buckets: ChartPoint[] = [];
      for (let index = 0; index < slice.length; index += 7) {
        const chunk = slice.slice(index, index + 7);
        if (chunk.length === 0) continue;
        const revenue = chunk.reduce((sum, point) => sum + point.revenue, 0);
        const transactions = chunk.reduce(
          (sum, point) => sum + point.transactions,
          0,
        );
        const last = chunk[chunk.length - 1];
        buckets.push({
          label: formatShortDay(keyToDate(last.date)),
          revenue,
          transactions,
        });
      }
      return buckets;
    }

    if (mode === "monthly") {
      const monthMap = new Map<string, { revenue: number; transactions: number }>();
      for (const point of series) {
        const key = point.date.slice(0, 7);
        const entry = monthMap.get(key) ?? { revenue: 0, transactions: 0 };
        entry.revenue += point.revenue;
        entry.transactions += point.transactions;
        monthMap.set(key, entry);
      }
      return [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([key, entry]) => ({
          label: monthLabel(key),
          revenue: entry.revenue,
          transactions: entry.transactions,
        }));
    }

    const filtered = series.filter(
      (point) => point.date >= customFrom && point.date <= customTo,
    );
    return filtered.map((point) => ({
      label: formatShortDay(keyToDate(point.date)),
      revenue: point.revenue,
      transactions: point.transactions,
    }));
  }, [mode, series, customFrom, customTo]);

  const totalRevenue = points.reduce((sum, point) => sum + point.revenue, 0);
  const totalTransactions = points.reduce(
    (sum, point) => sum + point.transactions,
    0,
  );
  const average = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-end gap-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Pendapatan periode
            </p>
            <p className="mt-1 text-[19px] font-semibold tracking-tight tabular-nums">
              {formatIDR(totalRevenue)}
            </p>
          </div>
          <div className="border-l border-border pl-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Transaksi
            </p>
            <p className="mt-1 text-[13px] font-medium tabular-nums">
              {formatNumber(totalTransactions)}
            </p>
          </div>
          <div className="hidden border-l border-border pl-5 sm:block">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Rata-rata
            </p>
            <p className="mt-1 text-[13px] font-medium tabular-nums">
              {formatIDR(average)}
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                mode === item.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "custom" ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            min={firstKey}
            max={customTo}
            onChange={(event) => setCustomFrom(event.target.value)}
            className="h-8 w-[150px] text-[12px]"
            aria-label="Tanggal mulai"
          />
          <span className="text-[11px] text-muted-foreground">hingga</span>
          <Input
            type="date"
            value={customTo}
            min={customFrom}
            max={lastKey}
            onChange={(event) => setCustomTo(event.target.value)}
            className="h-8 w-[150px] text-[12px]"
            aria-label="Tanggal akhir"
          />
        </div>
      ) : null}

      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="dashboard-revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#168F82" stopOpacity={0.3} />
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
              minTickGap={24}
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
                    <p className="mt-0.5 text-[13px] font-semibold tabular-nums">
                      {formatIDR(Number(payload[0]?.value ?? 0))}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {formatNumber(point?.transactions ?? 0)} transaksi
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#168F82"
              strokeWidth={2.2}
              fill="url(#dashboard-revenue)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#168F82",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              isAnimationActive={!reduceMotion}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
