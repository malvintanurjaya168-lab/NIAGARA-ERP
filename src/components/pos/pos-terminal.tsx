"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { checkoutAction, type CheckoutResult } from "@/lib/actions/sales";
import {
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  type PaymentMethodValue,
} from "@/lib/constants";
import { formatIDR, formatNumber, formatQuantity } from "@/lib/format";
import type { PosProduct, PosWarehouse } from "@/lib/queries/pos";
import { cn } from "@/lib/utils";

interface CartLine extends PosProduct {
  quantity: number;
}

type Receipt = Extract<CheckoutResult, { ok: true }>;

function paymentIcon(method: PaymentMethodValue) {
  switch (method) {
    case "CASH":
      return <Banknote className="size-3.5" />;
    case "BANK_TRANSFER":
      return <Landmark className="size-3.5" />;
    case "QRIS":
      return <QrCode className="size-3.5" />;
    case "CARD":
      return <CreditCard className="size-3.5" />;
    case "E_WALLET":
      return <Wallet className="size-3.5" />;
  }
}

export function PosTerminal({
  products,
  warehouses,
  selectedWarehouseId,
}: {
  products: PosProduct[];
  warehouses: PosWarehouse[];
  selectedWarehouseId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pendingWarehouse, setPendingWarehouse] = useState<string | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("CASH");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [pending, startTransition] = useTransition();

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      if (product.category) map.set(product.category.id, product.category.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        category === "all" || product.category?.id === category;
      const matchesQuery =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  const cartLines = useMemo<CartLine[]>(() => {
    const lines: CartLine[] = [];
    for (const [id, quantity] of Object.entries(cart)) {
      const product = productMap.get(id);
      if (product && quantity > 0) lines.push({ ...product, quantity });
    }
    return lines;
  }, [cart, productMap]);

  const total = cartLines.reduce(
    (sum, line) => sum + line.sellingPrice * line.quantity,
    0,
  );
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  function addProduct(product: PosProduct) {
    if (product.stockQuantity <= 0) return;
    const current = cart[product.id] ?? 0;
    if (current >= product.stockQuantity) {
      toast.error(
        `Stok ${product.name} hanya ${formatQuantity(product.stockQuantity, product.unit)}.`,
      );
      return;
    }
    setCart((previous) => ({ ...previous, [product.id]: current + 1 }));
  }

  function changeQuantity(productId: string, delta: number) {
    const product = productMap.get(productId);
    if (!product) return;
    setCart((previous) => {
      const current = previous[productId] ?? 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...previous };
        delete copy[productId];
        return copy;
      }
      if (next > product.stockQuantity) {
        toast.error(
          `Stok ${product.name} hanya ${formatQuantity(product.stockQuantity, product.unit)}.`,
        );
        return previous;
      }
      return { ...previous, [productId]: next };
    });
  }

  function removeLine(productId: string) {
    setCart((previous) => {
      const copy = { ...previous };
      delete copy[productId];
      return copy;
    });
  }

  function clearCart() {
    setCart({});
  }

  const selectedWarehouse = warehouses.find(
    (warehouse) => warehouse.id === selectedWarehouseId,
  );

  function switchWarehouse(warehouseId: string) {
    if (warehouseId === selectedWarehouseId) return;
    if (cartLines.length > 0) {
      setPendingWarehouse(warehouseId);
      return;
    }
    router.push(`/pos?gudang=${warehouseId}`);
  }

  function confirmWarehouseSwitch() {
    if (!pendingWarehouse) return;
    setCart({});
    router.push(`/pos?gudang=${pendingWarehouse}`);
    setPendingWarehouse(null);
  }

  function handleCheckout() {
    if (cartLines.length === 0 || pending) return;

    const items = cartLines.map((line) => ({
      productId: line.id,
      quantity: line.quantity,
    }));

    startTransition(async () => {
      const formData = new FormData();
      formData.set("items", JSON.stringify(items));
      formData.set("paymentMethod", paymentMethod);
      formData.set("clientRequestId", requestId);
      formData.set("warehouseId", selectedWarehouseId);

      const result = await checkoutAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setReceipt(result);
      setCart({});
      setRequestId(crypto.randomUUID());
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {warehouses.length > 0 ? (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Warehouse className="size-4 shrink-0 text-muted-foreground" />
                <Select
                  value={selectedWarehouseId}
                  onValueChange={switchWarehouse}
                >
                  <SelectTrigger
                    className="h-9 w-full sm:w-[220px]"
                    aria-label="Pilih gudang"
                  >
                    <SelectValue placeholder="Pilih gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} — {warehouse.name}
                        {warehouse.isDefault ? " (Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="relative w-full sm:max-w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari produk atau SKU…"
                className="h-9 pl-9 pr-8"
                aria-label="Cari produk"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
                  aria-label="Hapus pencarian"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  category === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                Semua
              </button>
              {categories.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    category === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="Belum ada produk aktif"
              description="Tambahkan produk di menu Inventaris sebelum memulai transaksi."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Produk tidak ditemukan"
              description="Coba kata kunci lain atau pilih kategori berbeda."
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((product) => {
                const inCart = cart[product.id] ?? 0;
                const unavailable = product.stockQuantity <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    disabled={unavailable}
                    className={cn(
                      "group relative flex flex-col rounded-xl border border-border/80 bg-card p-3 text-left shadow-soft transition-all",
                      unavailable
                        ? "cursor-not-allowed opacity-55"
                        : "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-float",
                    )}
                  >
                    {inCart > 0 ? (
                      <span className="absolute right-2 top-2 grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {inCart}
                      </span>
                    ) : null}

                    <p className="line-clamp-2 pr-6 text-[12.5px] font-medium leading-snug">
                      {product.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                      {product.sku}
                    </p>

                    <div className="mt-auto pt-3">
                      <p className="text-[13px] font-semibold tabular-nums">
                        {formatIDR(product.sellingPrice)}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          Stok {formatQuantity(product.stockQuantity, product.unit)}
                        </span>
                        <StockBadge
                          stock={product.stockQuantity}
                          minimum={0}
                          className="hidden text-[8.5px] sm:inline-flex"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Card className="flex h-fit flex-col border-border/80 shadow-soft lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/8 text-primary">
                <ShoppingCart className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold">Keranjang</p>
                <p className="text-[10.5px] text-muted-foreground">
                  {cartLines.length} produk · {formatNumber(itemCount)} item
                </p>
                {selectedWarehouse ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Warehouse className="size-3" />
                    {selectedWarehouse.code} — {selectedWarehouse.name}
                  </p>
                ) : null}
              </div>
            </div>
            {cartLines.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={clearCart}
                aria-label="Kosongkan keranjang"
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>

          <div className="max-h-[340px] min-h-[140px] overflow-y-auto px-2 py-2">
            {cartLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                  <ShoppingCart className="size-5" />
                </span>
                <p className="mt-3 text-[12.5px] font-medium">Keranjang kosong</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pilih produk di sebelah kiri untuk memulai transaksi.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {cartLines.map((line) => (
                  <li
                    key={line.id}
                    className="rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium">
                          {line.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatIDR(line.sellingPrice)} · {line.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label={`Hapus ${line.name}`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.id, -1)}
                          className="grid size-6 place-items-center rounded-md border border-border bg-card hover:bg-muted"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="min-w-7 text-center text-[12px] font-medium tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.id, 1)}
                          className="grid size-6 place-items-center rounded-md border border-border bg-card hover:bg-muted"
                          aria-label="Tambah jumlah"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <p className="text-[12px] font-semibold tabular-nums">
                        {formatIDR(line.sellingPrice * line.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border/70 px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Metode Pembayaran
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors",
                    paymentMethod === method.value
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {paymentIcon(method.value)}
                  {method.short}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
              <span className="text-[12px] text-muted-foreground">Total</span>
              <span className="text-[20px] font-semibold tracking-tight tabular-nums">
                {formatIDR(total)}
              </span>
            </div>

            <Button
              type="button"
              className="mt-3 w-full gap-2"
              size="lg"
              disabled={cartLines.length === 0 || pending}
              onClick={handleCheckout}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Memproses…
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Bayar {total > 0 ? formatIDR(total) : ""}
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
              Stok berkurang otomatis dan transaksi tersimpan permanen setelah
              pembayaran.
            </p>
          </div>
        </Card>
      </div>

      <Dialog
        open={pendingWarehouse !== null}
        onOpenChange={(open) => {
          if (!open) setPendingWarehouse(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="size-4 text-primary" />
              Ganti Gudang?
            </DialogTitle>
            <DialogDescription>
              Keranjang berisi {formatNumber(itemCount)} item dari gudang{" "}
              {selectedWarehouse?.name ?? "saat ini"}. Mengganti gudang akan
              mengosongkan keranjang dan memuat ulang ketersediaan stok.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPendingWarehouse(null)}
            >
              Batal
            </Button>
            <Button type="button" size="sm" onClick={confirmWarehouseSwitch}>
              Ganti & Kosongkan Keranjang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={receipt !== null}
        onOpenChange={(open) => {
          if (!open) setReceipt(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="items-center text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </span>
            <DialogTitle className="mt-2">Transaksi Berhasil</DialogTitle>
            <DialogDescription>
              {receipt?.alreadyRecorded
                ? "Transaksi ini sudah tercatat sebelumnya."
                : "Pembayaran telah dicatat dan stok telah diperbarui."}
            </DialogDescription>
          </DialogHeader>

          {receipt ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
              <ReceiptRow label="No. Transaksi">
                <span className="font-mono text-[11.5px]">
                  {receipt.transactionNumber}
                </span>
              </ReceiptRow>
              <ReceiptRow label="Metode">
                {PAYMENT_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}
              </ReceiptRow>
              <ReceiptRow label="Jumlah Item">
                {formatNumber(receipt.itemCount)} produk
              </ReceiptRow>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-[12px] font-medium">Total</span>
                <span className="text-[16px] font-semibold tabular-nums">
                  {formatIDR(receipt.totalAmount)}
                </span>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-center">
            <Button asChild variant="outline" size="sm">
              <Link href={receipt ? `/sales/${receipt.saleId}` : "/sales"}>
                Lihat Detail
              </Link>
            </Button>
            <Button size="sm" onClick={() => setReceipt(null)}>
              Transaksi Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReceiptRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="text-right text-[12px] font-medium">{children}</span>
    </div>
  );
}
