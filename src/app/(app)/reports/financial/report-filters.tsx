"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIOD_PRESETS } from "@/lib/periods";

export function ReportFilters({
  period,
  from,
  to,
}: {
  period: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function replace(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updatePeriod(value: string) {
    replace((params) => {
      params.set("period", value);
      if (value !== "custom") {
        params.delete("from");
        params.delete("to");
      }
    });
  }

  function updateDate(key: "from" | "to", value: string) {
    replace((params) => {
      params.set("period", "custom");
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={updatePeriod}>
        <SelectTrigger className="h-9 w-[160px] text-[12px]">
          <SelectValue placeholder="Periode" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" ? (
        <>
          <Input
            type="date"
            value={from}
            onChange={(event) => updateDate("from", event.target.value)}
            className="h-9 w-[150px] text-[12px]"
            aria-label="Tanggal mulai"
          />
          <span className="text-[11px] text-muted-foreground">hingga</span>
          <Input
            type="date"
            value={to}
            onChange={(event) => updateDate("to", event.target.value)}
            className="h-9 w-[150px] text-[12px]"
            aria-label="Tanggal akhir"
          />
        </>
      ) : null}
    </div>
  );
}
