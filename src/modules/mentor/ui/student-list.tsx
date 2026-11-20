import Link from "next/link";
import { ArrowRight, MessageCircleMore, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { formatSubmissionDate } from "@/modules/check-ins/ui/format";
import { conversationLabels, type MentorStudentSummary } from "@/modules/mentor/domain/presentation";
import type { MentorConversationRequest } from "@/generated/prisma/client";
import { followUpWindowLabels } from "@/modules/mentoring/domain/calendar";
import { formatSemesterDate } from "@/modules/check-ins/ui/format";

export function MentorSignal({ state }: { state: MentorConversationRequest }) {
  return <Badge variant="outline"><MessageCircleMore aria-hidden="true" />{conversationLabels[state]}</Badge>;
}
export function MentorEmpty({ title, description }: { title: string; description: string }) {
  return <Empty><EmptyHeader><EmptyMedia variant="icon"><UsersRound aria-hidden="true" /></EmptyMedia>
    <EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader></Empty>;
}
export function MentorStudentList({ students, emptyTitle = "No students to show", emptyDescription = "Try another search or filter." }: {
  students: MentorStudentSummary[]; emptyTitle?: string; emptyDescription?: string;
}) {
  if (!students.length) return <MentorEmpty title={emptyTitle} description={emptyDescription} />;
  return <ul className="flex min-w-0 flex-col divide-y rounded-xl border bg-card">
    {students.map((student) => <li key={student.id} className="grid min-w-0 gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-center">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="break-words font-medium">{student.name}</h3>
        <p className="text-sm text-muted-foreground">{student.completion}</p>
        <p className="text-xs text-muted-foreground">{student.latest
          ? `${student.latest.periodKey} · ${formatSubmissionDate(student.latest.submittedAt)}` : "No weekly Check-ins yet"}</p>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-2">
        {student.followUp ? <Badge variant="outline">{followUpWindowLabels[student.followUp.window]} · {formatSemesterDate(student.followUp.dueAt)}</Badge> : null}
        {student.attentionState !== "NORMAL" ? <Badge variant="outline">{student.attentionState === "CONVERSATION" ? "Conversation" : "Watch · Observation to review"}</Badge> : null}
        {student.latest && student.latest.conversation !== "NO" ? <>
          <MentorSignal state={student.latest.conversation} />
          <span className="text-xs text-muted-foreground">{student.conversationHandled ? "Request addressed in a conversation" : student.recentSignal ? "Recent response" : "Earlier response"} · {student.latest.periodKey}</span>
        </> : null}
        {student.observation ? <p className="text-sm leading-6">{student.observation.title}</p>
          : student.recentChange ? <p className="text-sm leading-6 text-muted-foreground">{student.recentChange.text}</p>
          : <p className="text-sm text-muted-foreground">No clear recent directional change.</p>}
      </div>
      <Link href={`/mentor/students/${student.id}`} aria-label={`View ${student.name}`}
        className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full lg:w-auto")}>
        View student<ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Link>
    </li>)}
  </ul>;
}
