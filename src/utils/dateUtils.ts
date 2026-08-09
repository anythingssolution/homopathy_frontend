/** Devendra Nagar / Pandri Branch — Friday schedule starts at 3:00 PM. */
export const DEVENDRA_NAGAR_BRANCH_ID = 2;
export const FRIDAY_SCHEDULE_START_TIME = "15:00:00";

/** True when YYYY-MM-DD is a Friday in local calendar. */
export const isFridayDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return date.getDay() === 5;
};

/** Normalize HH:MM or HH:MM:SS to HH:MM:SS for comparisons. */
export const normalizeTimeToSeconds = (timeStr: string): string => {
  const raw = String(timeStr || "").trim();
  if (!raw) return "";
  const parts = raw.split(":");
  const hours = String(parts[0] ?? "00").padStart(2, "0");
  const minutes = String(parts[1] ?? "00").padStart(2, "0");
  const seconds = String(parts[2] ?? "00").padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

/** Format HH:MM[:SS] to 12-hour display like `03:00 PM`. */
export const formatTimeTo12Hour = (timeStr: string): string => {
  const normalized = normalizeTimeToSeconds(timeStr);
  if (!normalized) return "";
  const [h, m] = normalized.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

/**
 * Client-side fallback for Devendra Nagar Friday schedule display.
 * Prefer backend effective_start_time when available.
 */
export const getEffectiveSlotDisplayTime = (
  branchId: number,
  slotStartTime: string,
  appointmentDate: string,
): string => {
  const normalizedStart = normalizeTimeToSeconds(slotStartTime);
  if (
    Number(branchId) === DEVENDRA_NAGAR_BRANCH_ID &&
    isFridayDate(appointmentDate) &&
    normalizedStart &&
    normalizedStart < FRIDAY_SCHEDULE_START_TIME
  ) {
    return formatTimeTo12Hour(FRIDAY_SCHEDULE_START_TIME);
  }
  return formatTimeTo12Hour(normalizedStart || slotStartTime);
};

export const isDevendraNagarFridaySchedule = (
  branchId: number | string | null | undefined,
  appointmentDate: string,
): boolean =>
  Number(branchId) === DEVENDRA_NAGAR_BRANCH_ID && isFridayDate(appointmentDate);

/** Shift Friday end display by the same delta as the 3:00 PM start rule. */
export const getEffectiveSlotDisplayEndTime = (
  branchId: number,
  slotStartTime: string,
  slotEndTime: string,
  appointmentDate: string,
): string => {
  if (!isDevendraNagarFridaySchedule(branchId, appointmentDate)) {
    return formatTimeTo12Hour(slotEndTime);
  }
  const nStart = normalizeTimeToSeconds(slotStartTime);
  const nEnd = normalizeTimeToSeconds(slotEndTime);
  if (!nStart || !nEnd || nStart >= FRIDAY_SCHEDULE_START_TIME) {
    return formatTimeTo12Hour(slotEndTime || nEnd);
  }
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const shiftedEnd =
    toMinutes(nEnd) +
    (toMinutes(FRIDAY_SCHEDULE_START_TIME) - toMinutes(nStart));
  if (shiftedEnd < 0 || shiftedEnd >= 24 * 60) {
    return formatTimeTo12Hour(slotEndTime);
  }
  const hours = Math.floor(shiftedEnd / 60);
  const minutes = shiftedEnd % 60;
  return formatTimeTo12Hour(
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
  );
};

/** True when a manual/custom time is before the Friday 3:00 PM open. */
export const isBeforeFridayScheduleStart = (
  branchId: number | string | null | undefined,
  appointmentDate: string,
  timeStr: string,
): boolean => {
  if (!isDevendraNagarFridaySchedule(branchId, appointmentDate)) return false;
  const normalized = normalizeTimeToSeconds(timeStr);
  return Boolean(normalized && normalized < FRIDAY_SCHEDULE_START_TIME);
};
