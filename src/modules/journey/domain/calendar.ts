import {
  getLuxembourgPeriodKey,
  INSTITUTION_TIME_ZONE,
} from "@/modules/check-ins/domain/period";

export const millisecondsPerDay = 86_400_000;

const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INSTITUTION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function localDateOrdinal(instant: Date): number {
  const parts = localDateFormatter.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((value) => value.type === type)?.value);

  return Date.UTC(part("year"), part("month") - 1, part("day")) / millisecondsPerDay;
}

export function storedDateOrdinal(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
    millisecondsPerDay;
}

/** A real ISO week's Monday, independent of daylight-saving or calendar year. */
export function weekOrdinal(periodKey: string): number | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  if (!match) return null;

  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  const januaryFourth = new Date(`${match[1]}-01-04T00:00:00.000Z`);
  const firstMonday = januaryFourth.getTime() / millisecondsPerDay -
    (januaryFourth.getUTCDay() + 6) % 7;
  const monday = firstMonday + (week - 1) * 7;
  // Not every ISO year has week 53. Midday avoids timezone boundary ambiguity.
  if (getLuxembourgPeriodKey(new Date(monday * millisecondsPerDay + 43_200_000)) !== periodKey) {
    return null;
  }

  return monday;
}

export function currentWeekOrdinal(now: Date): number | null {
  if (!Number.isFinite(now.getTime())) return null;
  return weekOrdinal(getLuxembourgPeriodKey(now));
}
