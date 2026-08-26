const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * "2026-08-24" -> "24 Aug 2026".
 *
 * The string is split by hand rather than passed through `new Date()`, because
 * parsing a calendar-only date as a Date treats it as UTC midnight and can show
 * the previous day to anyone west of Greenwich.
 */
export function formatDate(value?: string): string | null {
  if (!value) return null;

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return null;

  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Today as "YYYY-MM-DD" in the viewer's local time, not UTC. */
export function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

/** 150 -> "2h 30m", 45 -> "45m", 120 -> "2h". */
export function formatDuration(minutes?: number): string | null {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) return null;

  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
