export const APP_LOCALE = "id-ID";
export const APP_TIMEZONE = "Asia/Jakarta";

const idrFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat(APP_LOCALE, {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat(APP_LOCALE, {
  maximumFractionDigits: 3,
});

type Numeric = number | string | { toString(): string };

export function toNumber(value: Numeric | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIDR(value: Numeric | null | undefined): string {
  return idrFormatter.format(toNumber(value));
}

export function formatIDRCompact(value: Numeric | null | undefined): string {
  return `Rp ${compactFormatter.format(toNumber(value))}`;
}

export function formatNumber(value: Numeric | null | undefined): string {
  return numberFormatter.format(toNumber(value));
}

export function formatQuantity(value: Numeric | null | undefined, unit?: string): string {
  const formatted = numberFormatter.format(toNumber(value));
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${new Intl.NumberFormat(APP_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIMEZONE,
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const shortDayFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
});

export function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: Date | string | number): string {
  return dateFormatter.format(toDate(value));
}

export function formatLongDate(value: Date | string | number): string {
  return longDateFormatter.format(toDate(value));
}

export function formatDateTime(value: Date | string | number): string {
  return dateTimeFormatter.format(toDate(value));
}

export function formatTime(value: Date | string | number): string {
  return timeFormatter.format(toDate(value));
}

export function formatShortDay(value: Date | string | number): string {
  return shortDayFormatter.format(toDate(value));
}

export function formatRelativeDate(value: Date | string | number): string {
  const date = toDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(date);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
