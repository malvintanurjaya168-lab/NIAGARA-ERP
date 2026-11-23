"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/shared/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOVEMENT_LABELS,
  STOCK_MOVEMENT_FILTERS,
  type StockMovementFilter,
} from "@/lib/constants";

export function MovementFilters({
  q,
  type,
}: {
  q: string;
  type: StockMovementFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("type", value);
    } else {
      params.delete("type");
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput
        defaultValue={q}
        placeholder="Cari nama atau SKU produk…"
        className="sm:w-[280px]"
      />

      <Select value={type} onValueChange={update}>
        <SelectTrigger className="h-9 w-[190px] text-[12px]">
          <SelectValue placeholder="Semua jenis" />
        </SelectTrigger>
        <SelectContent>
          {STOCK_MOVEMENT_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {value === "all" ? "Semua jenis" : MOVEMENT_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
