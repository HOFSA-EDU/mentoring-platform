import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatSemesterDate } from "@/modules/check-ins/ui/format";
import type { listOpenFollowUps } from "../application/queries";
import { followUpWindowLabels } from "../domain/calendar";
import { FollowUpActions } from "./follow-up-actions";

export function FollowUpList({ followUps }: { followUps: Awaited<ReturnType<typeof listOpenFollowUps>> }) {
  if (!followUps.length) return <p className="rounded-xl border p-4 text-sm text-muted-foreground">No open follow-ups.</p>;
  return <ul className="flex min-w-0 flex-col divide-y rounded-xl border bg-card">{followUps.map((followUp) => <li key={followUp.id} className="flex min-w-0 flex-col gap-3 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><Link className="py-2 font-medium underline underline-offset-4" href={`/mentor/students/${followUp.studentId}#mentoring`}>{followUp.studentName}</Link>
      <Badge variant="outline">{followUpWindowLabels[followUp.window]} · {formatSemesterDate(followUp.dueAt)}</Badge></div>
    <p className="text-sm font-medium">{followUp.topic}</p>{followUp.note ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{followUp.note}</p> : null}
    <FollowUpActions studentId={followUp.studentId} followUpId={followUp.id} />
  </li>)}</ul>;
}
