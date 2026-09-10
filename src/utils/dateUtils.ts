/**
 * Time helpers shared by booking / queue / doctor screens.
 *
 * Weekly schedule rules (e.g. "Friday: first slot opens at 3:00 PM") are managed by the backend
 * (tbl_branch_recurring_schedule_rules) and surfaced through slot override timings and the
 * public `/schedule-rules` endpoint — nothing about branches or weekdays is hardcoded here.
 */

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
