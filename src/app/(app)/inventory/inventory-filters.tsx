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
import type { CategoryOption } from "@/lib/queries/inventory";

interface InventoryFiltersProps {
  categories: CategoryOption[];
  q: string;
  categoryId: string;
  status: string;
  sort: string;
}

export function InventoryFilters({
  categories,
  q,
  categoryId,
  status,
  sort,
}: InventoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput
        defaultValue={q}
        placeholder="Cari nama atau SKU…"
        className="sm:w-[280px]"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={categoryId || "all"}
          onValueChange={(value) => update("category", value)}
        >
          <SelectTrigger className="h-9 w-[170px] text-[12px]">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || "all"} onValueChange={(value) => update("status", value)}>
          <SelectTrigger className="h-9 w-[150px] text-[12px]">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="in">Tersedia</SelectItem>
            <SelectItem value="low">Stok menipis</SelectItem>
            <SelectItem value="out">Stok habis</SelectItem>
            <SelectItem value="attention">Perlu perhatian</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort || "recent"} onValueChange={(value) => update("sort", value)}>
          <SelectTrigger className="h-9 w-[160px] text-[12px]">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Terbaru diubah</SelectItem>
            <SelectItem value="name">Nama A–Z</SelectItem>
            <SelectItem value="stock-asc">Stok terendah</SelectItem>
            <SelectItem value="stock-desc">Stok tertinggi</SelectItem>
            <SelectItem value="value">Harga jual tertinggi</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
