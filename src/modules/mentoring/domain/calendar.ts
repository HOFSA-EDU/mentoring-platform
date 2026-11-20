import { INSTITUTION_TIME_ZONE } from "@/modules/check-ins/domain/period";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INSTITUTION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function mentoringLocalTime(date: Date) {
  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

// Explicit institution time, independent of browser/server timezone. Reject the
// missing spring hour; choose the first occurrence of the repeated autumn hour.
export function parseConversationTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  for (const offset of ["+02:00", "+01:00"]) {
    const date = new Date(`${value}:00${offset}`);
    if (Number.isFinite(date.getTime()) && mentoringLocalTime(date) === value) return date;
  }
  return null;
}

export function parseFollowUpDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export const followUpWindows = ["OVERDUE", "TODAY", "SOON", "LATER"] as const;
export type FollowUpWindow = typeof followUpWindows[number];
export const followUpWindowLabels = { OVERDUE: "Overdue", TODAY: "Due today", SOON: "Due soon", LATER: "Later" };

export function followUpWindow(dueAt: Date, now: Date): FollowUpWindow {
  const today = Date.parse(`${mentoringLocalTime(now).slice(0, 10)}T00:00:00Z`);
  const days = (dueAt.getTime() - today) / 86_400_000;
  return days < 0 ? "OVERDUE" : days === 0 ? "TODAY" : days <= 7 ? "SOON" : "LATER";
}

export function orderFollowUps<T extends { id: string; dueAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.id.localeCompare(b.id));
}
