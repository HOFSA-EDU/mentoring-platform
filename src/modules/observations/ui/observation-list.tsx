import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { domainLabels } from "@/modules/journey/domain/reflections";
import { formatSubmissionDate } from "@/modules/check-ins/ui/format";
import { MentorEmpty } from "@/modules/mentor/ui/student-list";
import { observationPriority } from "@/modules/observations/domain/attention";
import type { getMentorStudentDetail } from "@/modules/mentor/application/queries";

export const observationStatusLabels = { OPEN: "Open", ACKNOWLEDGED: "Acknowledged", RESOLVED: "Resolved" };
export const observationTypeLabels = {
  REPEATED_DIFFICULTY: "Repeated difficulty", WORSENING_PATTERN: "Worsening pattern", IMPROVEMENT: "Improvement", CONVERSATION_REQUEST: "Conversation request",
};

export function ObservationRefreshNotice() {
  return <Alert><NotebookPen /><AlertTitle>Observation update pending</AlertTitle>
    <AlertDescription>Check-ins are saved. Some Observations could not be refreshed; reload this page to try again.</AlertDescription></Alert>;
}

export function ObservationList({ studentId, observations }: {
  studentId: string; observations: Awaited<ReturnType<typeof getMentorStudentDetail>>["observations"];
}) {
  const ordered = [false, true].flatMap((resolved) => observationPriority.flatMap((type) => observations.filter((entry) =>
    (entry.status === "RESOLVED") === resolved && entry.type === type)));
  if (!ordered.length) return <MentorEmpty title="No formal Observations yet" description="An Observation needs an explicit conversation request or a supported pattern across comparable Check-ins." />;
  return <ul className="flex flex-col divide-y rounded-xl border bg-card">{ordered.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <h3 className="font-medium">{entry.title}</h3>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{observationStatusLabels[entry.status]}</Badge>
        <Badge variant={entry.type === "IMPROVEMENT" ? "secondary" : "outline"}>{observationTypeLabels[entry.type]}</Badge></div>
      <p className="text-sm text-muted-foreground">{entry.domain ? domainLabels[entry.domain] : "Conversation"} · Last supported {formatSubmissionDate(entry.lastDetectedAt)}</p>
    </div>
    <Link href={`/mentor/students/${studentId}/observations/${entry.id}`} aria-label={`Open Observation: ${entry.title}`}
      className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
      View evidence<ArrowRight data-icon="inline-end" /></Link>
  </li>)}</ul>;
}
