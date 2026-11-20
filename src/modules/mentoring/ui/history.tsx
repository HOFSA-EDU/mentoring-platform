import Link from "next/link";
import { MessageCirclePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSemesterDate, formatSubmissionDate } from "@/modules/check-ins/ui/format";
import { observationStatusLabels } from "@/modules/observations/ui/observation-list";
import type { getMentoringHistory } from "../application/queries";
import { followUpWindow, followUpWindowLabels } from "../domain/calendar";
import { FollowUpActions } from "./follow-up-actions";
import { AssignQuestLink } from "@/modules/quests/ui/quest-cards";

export function RecordConversationLink({ studentId, observationId }: { studentId: string; observationId?: string }) {
  return <Link href={`/mentor/students/${studentId}/mentoring/new${observationId ? `?observation=${encodeURIComponent(observationId)}` : ""}`}
    className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><MessageCirclePlus data-icon="inline-start" />Record conversation</Link>;
}

export function MentoringHistory({ studentId, conversations, now }: {
  studentId: string; conversations: Awaited<ReturnType<typeof getMentoringHistory>>; now: Date;
}) {
  return <section id="mentoring" aria-labelledby="mentoring-title" className="flex min-w-0 scroll-mt-6 flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="mentoring-title" className="text-lg font-semibold">Mentoring</h2><RecordConversationLink studentId={studentId} /></div>
    {!conversations.length ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">No mentoring conversations recorded yet.</p> :
      <ol className="flex flex-col gap-4">{conversations.map((conversation) => <li key={conversation.id}><Card size="sm">
        <CardHeader><CardTitle><h3>{conversation.topic}</h3></CardTitle><CardDescription>{formatSubmissionDate(conversation.occurredAt)} · Recorded by {conversation.mentor.user.name}</CardDescription></CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <div className="rounded-lg border p-3"><h4 className="text-sm font-medium">Private mentor note</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{conversation.privateNote || "No private note recorded."}</p></div>
          <div className="rounded-lg bg-muted p-3"><h4 className="text-sm font-medium">Shared agreement · visible to the Student</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{conversation.sharedAgreement?.text || "No shared agreement recorded."}</p></div>
          {conversation.observations.length ? <div><h4 className="mb-2 text-sm font-medium">Linked Observations</h4><ul className="flex flex-col gap-2">{conversation.observations.map(({ observation }) => <li key={observation.id}>
            <Link className="inline-block py-2 text-sm underline underline-offset-4" href={`/mentor/students/${studentId}/observations/${observation.id}`}>{observation.title} · {observationStatusLabels[observation.status]}</Link>
          </li>)}</ul></div> : null}
          {conversation.followUps.map((followUp) => <div key={followUp.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-medium">Internal follow-up · {formatSemesterDate(followUp.dueAt)}</h4>
              <Badge variant="outline">{followUp.status === "OPEN" ? followUpWindowLabels[followUpWindow(followUp.dueAt, now)] : followUp.status === "COMPLETED" ? "Completed" : "Cancelled"}</Badge></div>
            {followUp.note ? <p className="whitespace-pre-wrap text-sm leading-6">{followUp.note}</p> : null}
            {followUp.completedAt || followUp.cancelledAt ? <p className="text-xs text-muted-foreground">Closed {formatSubmissionDate((followUp.completedAt || followUp.cancelledAt)!)}</p> : null}
            {followUp.status === "OPEN" ? <FollowUpActions studentId={studentId} followUpId={followUp.id} /> : null}
          </div>)}
          <AssignQuestLink studentId={studentId} conversationId={conversation.id} />
        </CardContent></Card></li>)}</ol>}
  </section>;
}
