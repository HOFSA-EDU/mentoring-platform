import { INSTITUTION_TIME_ZONE } from "@/modules/check-ins/domain/period";

export function formatSubmissionDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: INSTITUTION_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatSemesterDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(date);
}
