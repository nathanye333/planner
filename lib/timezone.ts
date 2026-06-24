import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";

function parseYmd(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** Inclusive planner window as UTC instants for DB range queries. */
export function plannerWindowBounds(
  dateStart: string,
  dateEnd: string,
  timezone: string,
) {
  const startParts = parseYmd(dateStart);
  const endParts = parseYmd(dateEnd);
  const start = new TZDate(
    startParts.y,
    startParts.m - 1,
    startParts.d,
    0,
    0,
    0,
    timezone,
  );
  const endExclusive = addDays(
    new TZDate(endParts.y, endParts.m - 1, endParts.d, 0, 0, 0, timezone),
    1,
  );
  return {
    windowStart: start.toISOString(),
    windowEnd: endExclusive.toISOString(),
  };
}

/** YYYY-MM-DD for the calendar day after `date` in the given timezone. */
export function dayAfterDate(date: string, timezone: string) {
  const { y, m, d } = parseYmd(date);
  const next = addDays(new TZDate(y, m - 1, d, timezone), 1);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Format a YYYY-MM-DD planner date in the given timezone (no UTC day shift). */
export function formatCalendarDate(date: string, timezone: string) {
  const { y, m, d } = parseYmd(date);
  const anchor = new TZDate(y, m - 1, d, 12, 0, 0, timezone);
  return anchor.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
}

export function formatTimeInTimezone(iso: string, timezone: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export function formatDayInTimezone(iso: string, timezone: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    timeZone: timezone,
  });
}
