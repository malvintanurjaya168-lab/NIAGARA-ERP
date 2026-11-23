"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import {
  createProductAction,
  updateProductAction,
} from "@/lib/actions/inventory";
import { UNITS } from "@/lib/constants";
import type { CategoryOption } from "@/lib/queries/inventory";
import type { ActionResult } from "@/lib/errors";

export interface ProductFormValues {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  isActive: boolean;
}

interface ProductFormProps {
  categories: CategoryOption[];
  product?: ProductFormValues;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const isEdit = Boolean(product);
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    isEdit ? updateProductAction : createProductAction,
    undefined,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Produk disimpan.");
      if (state.id) {
        router.push(`/inventory/${state.id}`);
        router.refresh();
      }
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      {state && !state.ok && !errors ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Nama Produk</Label>
          <Input
            id="name"
            name="name"
            defaultValue={product?.name}
            placeholder="Contoh: Kopi Arabika Gayo 250g"
            maxLength={120}
            required
            aria-invalid={Boolean(errors?.name)}
          />
          <FieldError messages={errors?.name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            name="sku"
            defaultValue={product?.sku}
            placeholder="KOPI-GAYO-250"
            maxLength={40}
            required
            className="font-mono uppercase"
            aria-invalid={Boolean(errors?.sku)}
          />
          <p className="text-[10.5px] text-muted-foreground">
            Kode unik produk. Huruf akan otomatis menjadi kapital.
          </p>
          <FieldError messages={errors?.sku} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit">Satuan</Label>
          <Input
            id="unit"
            name="unit"
            defaultValue={product?.unit ?? "pcs"}
            list="unit-options"
            placeholder="pcs"
            maxLength={20}
            required
            aria-invalid={Boolean(errors?.unit)}
          />
          <datalist id="unit-options">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <FieldError messages={errors?.unit} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Kategori</Label>
          <Select
            name="categoryId"
            defaultValue={product?.categoryId ?? "none"}
          >
            <SelectTrigger id="categoryId" className="w-full">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tanpa kategori</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={errors?.categoryId} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minimumStock">Stok Minimum</Label>
          <Input
            id="minimumStock"
            name="minimumStock"
            type="number"
            min="0"
            step="0.001"
            defaultValue={product?.minimumStock ?? 5}
            required
            aria-invalid={Boolean(errors?.minimumStock)}
          />
          <p className="text-[10.5px] text-muted-foreground">
            Peringatan muncul saat stok mencapai angka ini.
          </p>
          <FieldError messages={errors?.minimumStock} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purchasePrice">Harga Beli (HPP)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
              Rp
            </span>
            <Input
              id="purchasePrice"
              name="purchasePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.purchasePrice ?? ""}
              placeholder="0"
              className="pl-9"
              required
              aria-invalid={Boolean(errors?.purchasePrice)}
            />
          </div>
          <FieldError messages={errors?.purchasePrice} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sellingPrice">Harga Jual</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
              Rp
            </span>
            <Input
              id="sellingPrice"
              name="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.sellingPrice ?? ""}
              placeholder="0"
              className="pl-9"
              required
              aria-invalid={Boolean(errors?.sellingPrice)}
            />
          </div>
          <FieldError messages={errors?.sellingPrice} />
        </div>

        {!isEdit ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="stockQuantity">Stok Awal</Label>
            <Input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              min="0"
              step="0.001"
              defaultValue={0}
              required
              aria-invalid={Boolean(errors?.stockQuantity)}
            />
            <p className="flex items-start gap-1 text-[10.5px] text-muted-foreground">
              <Info className="mt-0.5 size-3 shrink-0" />
              Stok awal akan tercatat sebagai pergerakan stok masuk. Setelah
              produk dibuat, gunakan penyesuaian stok untuk mengubah jumlahnya.
            </p>
            <FieldError messages={errors?.stockQuantity} />
          </div>
        ) : null}
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={product?.isActive ?? true}
          className="size-3.5 accent-primary"
        />
        <span className="text-[12px] font-medium">Produk aktif</span>
        <span className="text-[10.5px] text-muted-foreground">
          (dapat dijual di POS)
        </span>
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={product ? `/inventory/${product.id}` : "/inventory"}>
            Batal
          </Link>
        </Button>
        <SubmitButton size="sm" pendingText="Menyimpan…">
          {isEdit ? "Simpan Perubahan" : "Tambah Produk"}
        </SubmitButton>
      </div>
    </form>
  );
}
