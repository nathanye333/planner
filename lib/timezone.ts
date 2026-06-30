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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD that is `offsetDays` from today in the given timezone. */
export function offsetDateInTimezone(offsetDays: number, timezone: string) {
  const now = new TZDate(new Date(), timezone);
  const d = addDays(
    new TZDate(now.getFullYear(), now.getMonth(), now.getDate(), timezone),
    offsetDays,
  );
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("-");
}

/**
 * FullCalendar named timezones without a TZ plugin use "UTC-coercion": wall-clock
 * times in `timezone` are represented as UTC on native Date objects. Convert real
 * UTC instants from storage into that shape for calendar rendering.
 */
export function utcIsoForFullCalendar(iso: string, timezone: string) {
  const d = new TZDate(new Date(iso), timezone);
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    ),
  ).toISOString();
}

/** Inverse of {@link utcIsoForFullCalendar} — calendar selection → DB UTC instant. */
export function utcIsoFromFullCalendar(date: Date, timezone: string) {
  return new TZDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    timezone,
  ).toISOString();
}

/** UTC instant → "YYYY-MM-DDTHH:mm" wall-clock in tz for <input type="datetime-local">. */
export function isoToLocalInput(iso: string, timezone: string) {
  const d = new TZDate(new Date(iso), timezone);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" wall-clock in tz → UTC instant ISO for storage. */
export function localInputToIso(local: string, timezone: string) {
  const [datePart, timePart = "00:00"] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new TZDate(y, m - 1, d, hh, mm, 0, timezone).toISOString();
}

/** Default new-event inputs in tz: next full hour, lasting two hours. */
export function defaultEventInputs(timezone: string) {
  const now = new TZDate(new Date(), timezone);
  const start = new TZDate(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + 1,
    0,
    0,
    timezone,
  );
  const end = new TZDate(start.getTime() + 2 * 60 * 60 * 1000, timezone);
  return {
    start: isoToLocalInput(start.toISOString(), timezone),
    end: isoToLocalInput(end.toISOString(), timezone),
  };
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
