export const MEDICATION_DURATION_OPTIONS = [
  { key: "7", label: "7", days: 7 },
  { key: "15", label: "15", days: 15 },
  { key: "30", label: "30", days: 30 },
  { key: "45", label: "45", days: 45 },
  { key: "2M", label: "2 Mo", days: 60 },
  { key: "3M", label: "3 Mo", days: 90 },
  { key: "6M", label: "6 Mo", days: 180 },
] as const;

export type MedicationDurationKey =
  (typeof MEDICATION_DURATION_OPTIONS)[number]["key"];

export const ALLOWED_MEDICATION_DURATION_DAYS = new Set(
  MEDICATION_DURATION_OPTIONS.map((option) => option.days),
);

const DURATION_MULTIPLIERS: Record<number, number> = {
  7: 1,
  15: 2,
  30: 4,
  45: 6,
  60: 8,
  90: 12,
  180: 24,
};

export function normalizeDurationKey(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "15";

  const byKey = MEDICATION_DURATION_OPTIONS.find((option) => option.key === raw);
  if (byKey) return byKey.key;

  const legacyMatch = raw.match(/^(\d+)/);
  if (legacyMatch) {
    return getDurationKeyFromDays(Number(legacyMatch[1]));
  }

  return "15";
}

export function getDurationDaysFromKey(value: string | null | undefined): number {
  const key = normalizeDurationKey(value);
  const option = MEDICATION_DURATION_OPTIONS.find((item) => item.key === key);
  return option?.days ?? 15;
}

export function getDurationKeyFromDays(days: number): string {
  const numericDays = Number(days);
  if (!Number.isFinite(numericDays) || numericDays <= 0) return "15";

  const dayMatch = MEDICATION_DURATION_OPTIONS.find(
    (option) => option.days === numericDays,
  );
  if (dayMatch) return dayMatch.key;

  return String(numericDays);
}

export function getDurationMultiplier(value: string | null | undefined): number {
  const days = getDurationDaysFromKey(value);
  return DURATION_MULTIPLIERS[days] ?? 1;
}

export function isThirtyMlPacking(value: string | number | null | undefined): boolean {
  return String(value || "").replace(/\s+/g, "").toLowerCase() === "30ml";
}

const looksLikeDropsCategory = (value: string | null | undefined): boolean => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return false;
  return (
    normalized === "DROP" ||
    normalized === "DROPS" ||
    normalized.includes("DROPS")
  );
};

export function isDrops30MlSelection(fields: {
  category?: string | null;
  product_type?: string | null;
  packing?: string | null;
  size_or_weight?: string | null;
  label?: string | null;
} | null | undefined): boolean {
  if (!fields) return false;

  const isDrops =
    looksLikeDropsCategory(fields.category) ||
    looksLikeDropsCategory(fields.product_type);
  const is30Ml =
    isThirtyMlPacking(fields.packing) ||
    isThirtyMlPacking(fields.size_or_weight) ||
    isThirtyMlPacking(fields.label);

  return isDrops && is30Ml;
}

/** 30 ml DROPS: 1 bottle covers up to 15 days (7 and 15 stay 1, 30→2, 45→3). */
export function getDrops30MlQuantity(value: string | null | undefined): number {
  const days = getDurationDaysFromKey(value);
  return Math.max(1, Math.ceil(days / 15));
}

export function isThirtyDayDuration(value: string | null | undefined): boolean {
  return getDurationDaysFromKey(value) === 30;
}

export const MEDICATION_DURATION_DAY_OPTIONS = MEDICATION_DURATION_OPTIONS.filter(
  (option) => !option.key.endsWith("M"),
);

export const MEDICATION_DURATION_MONTH_OPTIONS = MEDICATION_DURATION_OPTIONS.filter(
  (option) => option.key.endsWith("M"),
);

export function getDurationMonths(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    if (value === 60) return 2;
    if (value === 90) return 3;
    if (value === 180) return 6;
    return 0;
  }

  const key = normalizeDurationKey(value);
  const option = MEDICATION_DURATION_MONTH_OPTIONS.find((item) => item.key === key);
  return option ? Math.round(option.days / 30) : 0;
}

export function isMonthDuration(value: string | null | undefined): boolean {
  return getDurationMonths(value) > 0;
}

export function formatDurationLabel(value: string | null | undefined): string {
  const key = normalizeDurationKey(value);
  const option = MEDICATION_DURATION_OPTIONS.find((item) => item.key === key);
  return option?.label ?? `${getDurationDaysFromKey(key)} Days`;
}

export function formatPrintDurationLabel(days: number, isHi = false): string {
  const numericDays = Number(days) || 0;
  if (numericDays <= 0) return '';

  const months = getDurationMonths(numericDays);
  if (months > 0) {
    if (isHi) return months === 1 ? '1 माह' : `${months} माह`;
    return months === 1 ? '1 Month' : `${months} Months`;
  }

  if (isHi) return numericDays === 1 ? '1 दिन' : `${numericDays} दिन`;
  return numericDays === 1 ? '1 Day' : `${numericDays} Days`;
}

const formatGbDate = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function getMedicationPeriodDates(
  startDate: string | Date | null | undefined,
  days: number,
): { fromDate: string; toDate: string } | null {
  const numericDays = Number(days) || 0;
  if (!startDate || numericDays <= 0) return null;

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(numericDays - 1, 0));

  return {
    fromDate: formatGbDate(start),
    toDate: formatGbDate(end),
  };
}
