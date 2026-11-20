export const INSTITUTION_TIME_ZONE = "Europe/Luxembourg";

const millisecondsPerDay = 86_400_000;
const luxembourgDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INSTITUTION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type StudyPeriod = {
  periodKey: string;
  studyWeekIndex: number;
  studyWeekNumber: number;
  localDate: string;
};

function calendarDateInLuxembourg(instant: Date): CalendarDate {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError("A valid instant is required.");
  }

  const parts = luxembourgDateFormatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

function calendarDateFromStoredDate(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function ordinal(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / millisecondsPerDay;
}

function mondayOrdinal(date: CalendarDate): number {
  const utcDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;
  return ordinal(date) - daysSinceMonday;
}

function isoWeek(date: CalendarDate): { year: number; week: number } {
  const thursday = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const isoDay = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - isoDay);
  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / millisecondsPerDay + 1) / 7,
  );

  return { year: isoYear, week };
}

function formatCalendarDate(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function getLuxembourgPeriodKey(instant: Date): string {
  const { year, week } = isoWeek(calendarDateInLuxembourg(instant));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function calculateStudyPeriod(
  instant: Date,
  semesterStart: Date,
  semesterEnd: Date,
): StudyPeriod | null {
  const localDate = calendarDateInLuxembourg(instant);
  const startDate = calendarDateFromStoredDate(semesterStart);
  const endDate = calendarDateFromStoredDate(semesterEnd);
  const localOrdinal = ordinal(localDate);

  if (localOrdinal < ordinal(startDate) || localOrdinal > ordinal(endDate)) {
    return null;
  }

  const studyWeekIndex =
    (mondayOrdinal(localDate) - mondayOrdinal(startDate)) / 7;

  if (!Number.isInteger(studyWeekIndex) || studyWeekIndex < 0) {
    throw new RangeError("The semester dates do not produce a valid study week.");
  }

  return {
    periodKey: getLuxembourgPeriodKey(instant),
    studyWeekIndex,
    studyWeekNumber: studyWeekIndex + 1,
    localDate: formatCalendarDate(localDate),
  };
}
