"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/shared/search-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/constants";
import { PERIOD_PRESETS } from "@/lib/periods";
import type { CashierOption } from "@/lib/queries/sales";

interface SalesFiltersProps {
  q: string;
  period: string;
  from: string;
  to: string;
  payment: string;
  status: string;
  cashier: string;
  cashiers: CashierOption[];
  showCashier: boolean;
}

export function SalesFilters({
  q,
  period,
  from,
  to,
  payment,
  status,
  cashier,
  cashiers,
  showCashier,
}: SalesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function replace(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function update(key: string, value: string) {
    replace((params) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    });
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
    <div className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          defaultValue={q}
          placeholder="Cari nomor transaksi…"
          className="sm:w-[260px]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={updatePeriod}>
            <SelectTrigger className="h-9 w-[150px] text-[12px]">
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

          <Select value={payment || "all"} onValueChange={(value) => update("payment", value)}>
            <SelectTrigger className="h-9 w-[140px] text-[12px]">
              <SelectValue placeholder="Metode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua metode</SelectItem>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status || "all"} onValueChange={(value) => update("status", value)}>
            <SelectTrigger className="h-9 w-[130px] text-[12px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="VOIDED">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>

          {showCashier ? (
            <Select
              value={cashier || "all"}
              onValueChange={(value) => update("cashier", value)}
            >
              <SelectTrigger className="h-9 w-[160px] text-[12px]">
                <SelectValue placeholder="Kasir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kasir</SelectItem>
                {cashiers.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      {period === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(event) => updateDate("from", event.target.value)}
            className="h-8 w-[150px] text-[12px]"
            aria-label="Tanggal mulai"
          />
          <span className="text-[11px] text-muted-foreground">hingga</span>
          <Input
            type="date"
            value={to}
            onChange={(event) => updateDate("to", event.target.value)}
            className="h-8 w-[150px] text-[12px]"
            aria-label="Tanggal akhir"
          />
        </div>
      ) : null}
    </div>
  );
}
