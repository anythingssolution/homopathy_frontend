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

export function isThirtyDayDuration(value: string | null | undefined): boolean {
  return getDurationDaysFromKey(value) === 30;
}

export const MEDICATION_DURATION_DAY_OPTIONS = MEDICATION_DURATION_OPTIONS.filter(
  (option) => !option.key.endsWith("M"),
);

export const MEDICATION_DURATION_MONTH_OPTIONS = MEDICATION_DURATION_OPTIONS.filter(
  (option) => option.key.endsWith("M"),
);

export function isMonthDuration(value: string | null | undefined): boolean {
  return MEDICATION_DURATION_MONTH_OPTIONS.some(
    (option) => option.key === normalizeDurationKey(value),
  );
}

export function formatDurationLabel(value: string | null | undefined): string {
  const key = normalizeDurationKey(value);
  const option = MEDICATION_DURATION_OPTIONS.find((item) => item.key === key);
  return option?.label ?? `${getDurationDaysFromKey(key)} Days`;
}
