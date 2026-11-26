export const PAYMENT_METHODS = [
  { value: "CASH", label: "Tunai", short: "Tunai" },
  { value: "BANK_TRANSFER", label: "Transfer Bank", short: "Transfer" },
  { value: "QRIS", label: "QRIS", short: "QRIS" },
  { value: "CARD", label: "Kartu Debit/Kredit", short: "Kartu" },
  { value: "E_WALLET", label: "E-Wallet", short: "E-Wallet" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
);

export const PAYMENT_SHORT_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.short]),
);

export const SALE_STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Selesai",
  VOIDED: "Dibatalkan",
};

export const MOVEMENT_LABELS: Record<string, string> = {
  STOCK_IN: "Stok Masuk",
  STOCK_OUT: "Stok Keluar",
  ADJUSTMENT: "Penyesuaian",
  SALE: "Penjualan",
  SALE_VOID: "Pembatalan Penjualan",
};

export const STOCK_MOVEMENT_FILTERS = [
  "all",
  "STOCK_IN",
  "STOCK_OUT",
  "ADJUSTMENT",
  "SALE",
  "SALE_VOID",
] as const;

export type StockMovementFilter = (typeof STOCK_MOVEMENT_FILTERS)[number];

export const MOVEMENT_TONES: Record<string, string> = {
  STOCK_IN: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  STOCK_OUT: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  ADJUSTMENT: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  SALE: "bg-primary/10 text-primary border-primary/20",
  SALE_VOID: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

export const STOCK_STATUS = {
  inStock: { label: "Tersedia", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  low: { label: "Stok Menipis", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  out: { label: "Stok Habis", className: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
} as const;

export const UNITS = [
  "pcs",
  "unit",
  "box",
  "pack",
  "lusin",
  "kg",
  "gram",
  "liter",
  "ml",
  "meter",
  "botol",
  "kaleng",
] as const;

export const PAGE_SIZE = 10;
export const SALES_PAGE_SIZE = 12;

export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
] as const;

export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue, string> = {
  ASSET: "Aset",
  LIABILITY: "Utang",
  EQUITY: "Modal",
  REVENUE: "Pendapatan",
  EXPENSE: "Beban",
};

export const ACCOUNT_TYPE_BADGE: Record<AccountTypeValue, string> = {
  ASSET: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  LIABILITY: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  EQUITY: "border-violet-500/20 bg-violet-500/10 text-violet-700",
  REVENUE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  EXPENSE: "border-rose-500/20 bg-rose-500/10 text-rose-700",
};
