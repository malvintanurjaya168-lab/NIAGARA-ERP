import { APP_TIMEZONE } from "@/lib/format";

export type PeriodPreset =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
  { value: "month", label: "Bulan Ini" },
  { value: "quarter", label: "Kuartal" },
  { value: "year", label: "Tahun Fiskal" },
  { value: "custom", label: "Kustom" },
];

export interface PeriodRange {
  preset: PeriodPreset;
  /** Inclusive first Jakarta day, formatted YYYY-MM-DD. */
  fromKey: string;
  /** Inclusive last Jakarta day, formatted YYYY-MM-DD. */
  toKey: string;
  /** Instant of 00:00 Asia/Jakarta on fromKey. */
  from: Date;
  /** Exclusive instant (00:00 Asia/Jakarta on the day after toKey). */
  to: Date;
  label: string;
  rangeLabel: string;
}

const JAKARTA_OFFSET_HOURS = 7;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseKey(key: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    const now = new Date();
    return {
      y: Number(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: APP_TIMEZONE,
          year: "numeric",
        }).format(now),
      ),
      m: 1,
      d: 1,
    };
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function keyFromParts(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDaysKey(key: string, days: number): string {
  const { y, m, d } = parseKey(key);
  return keyFromParts(y, m, d + days);
}

export function addMonthsToParts(y: number, m: number, months: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + months;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

/** 00:00 Asia/Jakarta expressed as a UTC instant. Jakarta has no DST (UTC+7). */
export function jakartaDayStart(key: string): Date {
  const { y, m, d } = parseKey(key);
  return new Date(
    Date.UTC(y, m - 1, d, -JAKARTA_OFFSET_HOURS, 0, 0, 0),
  );
}

export function todayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function dayKeyOf(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function rangeLabel(from: Date, toExclusive: Date): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const lastInclusive = new Date(toExclusive.getTime() - 1);
  return `${formatter.format(from)} – ${formatter.format(lastInclusive)}`;
}

export function fiscalQuarterStart(
  y: number,
  m: number,
  fiscalYearStartMonth: number,
): { y: number; m: number } {
  const startMonth = Math.min(12, Math.max(1, fiscalYearStartMonth));
  const fiscalYearStartYear = m >= startMonth ? y : y - 1;
  const monthsSinceStart = (y - fiscalYearStartYear) * 12 + (m - startMonth);
  const quarterIndex = Math.floor(monthsSinceStart / 3);
  const absoluteStartMonth = fiscalYearStartYear * 12 + (startMonth - 1) + quarterIndex * 3;
  return {
    y: Math.floor(absoluteStartMonth / 12),
    m: (absoluteStartMonth % 12) + 1,
  };
}

export function fiscalYearStartYear(
  y: number,
  m: number,
  fiscalYearStartMonth: number,
): number {
  const startMonth = Math.min(12, Math.max(1, fiscalYearStartMonth));
  return m >= startMonth ? y : y - 1;
}

export interface ResolvePeriodOptions {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  fiscalYearStartMonth?: number;
  now?: Date;
}

export function resolvePeriod({
  preset,
  from,
  to,
  fiscalYearStartMonth = 1,
  now = new Date(),
}: ResolvePeriodOptions): PeriodRange {
  const today = todayKey(now);
  const { y, m } = parseKey(today);
  const startMonth = Math.min(12, Math.max(1, fiscalYearStartMonth));

  let selected: PeriodPreset = (PERIOD_PRESETS.find((p) => p.value === preset)?.value ??
    "30d") as PeriodPreset;

  let fromKey = today;
  let toKey = today;
  let label = "30 Hari Terakhir";

  switch (selected) {
    case "today":
      fromKey = today;
      toKey = today;
      label = "Hari Ini";
      break;
    case "7d":
      fromKey = addDaysKey(today, -6);
      toKey = today;
      label = "7 Hari Terakhir";
      break;
    case "30d":
      fromKey = addDaysKey(today, -29);
      toKey = today;
      label = "30 Hari Terakhir";
      break;
    case "month": {
      fromKey = keyFromParts(y, m, 1);
      const next = addMonthsToParts(y, m, 1);
      toKey = addDaysKey(keyFromParts(next.y, next.m, 1), -1);
      label = "Bulan Ini";
      break;
    }
    case "quarter": {
      const start = fiscalQuarterStart(y, m, startMonth);
      const next = addMonthsToParts(start.y, start.m, 3);
      fromKey = keyFromParts(start.y, start.m, 1);
      toKey = addDaysKey(keyFromParts(next.y, next.m, 1), -1);
      label = "Kuartal Fiskal";
      break;
    }
    case "year": {
      const startYear = fiscalYearStartYear(y, m, startMonth);
      fromKey = keyFromParts(startYear, startMonth, 1);
      const next = addMonthsToParts(startYear, startMonth, 12);
      toKey = addDaysKey(keyFromParts(next.y, next.m, 1), -1);
      label = "Tahun Fiskal";
      break;
    }
    case "custom": {
      const validFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : addDaysKey(today, -29);
      const validTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today;
      const [startKey, endKey] =
        validFrom <= validTo ? [validFrom, validTo] : [validTo, validFrom];
      fromKey = startKey;
      toKey = endKey;
      label = "Rentang Kustom";
      break;
    }
    default:
      selected = "30d";
  }

  const fromDate = jakartaDayStart(fromKey);
  const toExclusive = jakartaDayStart(addDaysKey(toKey, 1));

  return {
    preset: selected,
    fromKey,
    toKey,
    from: fromDate,
    to: toExclusive,
    label,
    rangeLabel: rangeLabel(fromDate, toExclusive),
  };
}

export function previousPeriod(range: PeriodRange): { from: Date; to: Date } {
  const duration = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime()),
  };
}

export function eachDayKey(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  let cursor = fromKey;
  let guard = 0;
  while (cursor <= toKey && guard < 800) {
    keys.push(cursor);
    cursor = addDaysKey(cursor, 1);
    guard += 1;
  }
  return keys;
}
