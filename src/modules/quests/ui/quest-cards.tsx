import Link from "next/link";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { domainLabels } from "@/modules/journey/domain/reflections";
import { formatSemesterDate, formatSubmissionDate } from "@/modules/check-ins/ui/format";
import type { QuestView } from "../application/queries";
import { attemptLabels, helpfulnessLabels, isQuestOverdue, questMilestones, questStatusLabels } from "../domain/presentation";
import { CancelQuestForm } from "./cancel-form";

export function QuestStatus({ quest, now }: { quest: Pick<QuestView, "status" | "dueAt">; now: Date }) {
  return <div className="flex flex-wrap gap-2"><Badge variant="outline">{questStatusLabels[quest.status]}</Badge>{isQuestOverdue(quest, now) ? <Badge variant="secondary">Overdue</Badge> : null}</div>;
}

export function QuestReflectionSummary({ reflection }: { reflection: NonNullable<QuestView["reflection"]> }) {
  return <div className="flex flex-col gap-3 rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Reflected on {formatSubmissionDate(reflection.submittedAt)}</p>
    <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Attempted</dt><dd>{attemptLabels[reflection.attempted]}</dd></div>
      <div><dt className="text-muted-foreground">Helpful</dt><dd>{helpfulnessLabels[reflection.helpful]}</dd></div>
      {reflection.reflectionText ? <div className="col-span-2"><dt className="text-muted-foreground">What I noticed</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{reflection.reflectionText}</dd></div> : null}</dl>
  </div>;
}

export function QuestCard({ quest, now, mentorStudentId }: { quest: QuestView; now: Date; mentorStudentId?: string }) {
  return <Card size="sm" className="min-w-0 break-words"><CardHeader>
    <QuestStatus quest={quest} now={now} /><CardTitle><h3>{quest.title}</h3></CardTitle>
    <CardDescription>{domainLabels[quest.domain]} · Try it by {formatSemesterDate(quest.dueAt)}</CardDescription>
  </CardHeader><CardContent className="flex flex-col gap-3">
    <p className="whitespace-pre-wrap text-sm leading-6">{quest.description}</p>
    {mentorStudentId ? <><p className="text-xs text-muted-foreground">Assigned {formatSubmissionDate(quest.assignedAt)}</p>
      {quest.sharedAgreement ? <div className="rounded-lg border p-3 text-sm"><p className="mb-1 font-medium">Linked shared agreement</p><p className="whitespace-pre-wrap leading-6">{quest.sharedAgreement.text}</p></div> : null}
      {quest.reflection ? <QuestReflectionSummary reflection={quest.reflection} /> : null}</> : null}
  </CardContent><CardFooter>
    {mentorStudentId ? quest.status === "ACTIVE" ? <CancelQuestForm studentId={mentorStudentId} questId={quest.id} /> :
      <p className="text-xs text-muted-foreground">{quest.status === "COMPLETED" ? "Completed means a reflection was submitted, regardless of the outcome." : "Cancelled. Kept in the history."}</p>
      : <Link href={`/student/quests/${quest.id}`} aria-label={`Open Quest: ${quest.title}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-auto")}>Open Quest<ArrowRight data-icon="inline-end" /></Link>}
  </CardFooter></Card>;
}

export function ActiveQuests({ quests, now }: { quests: QuestView[]; now: Date }) {
  const active = quests.filter(({ status }) => status === "ACTIVE").sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.id.localeCompare(b.id));
  return <section aria-labelledby="active-quests-title" className="flex min-w-0 flex-col gap-3"><div className="flex flex-wrap items-center justify-between gap-2">
    <h2 id="active-quests-title" className="flex items-center gap-2 text-lg font-semibold"><FlaskConical aria-hidden="true" className="size-5 shrink-0" />Active Quests</h2>
    <Link href="/student/quests" className="py-3 text-sm underline underline-offset-4">All Quests</Link></div>
    <p className="text-sm text-muted-foreground">Small experiments to find out what works for you.</p>
    {active.length ? <div className="grid min-w-0 gap-3 md:grid-cols-2">{active.map((quest) => <QuestCard key={quest.id} quest={quest} now={now} />)}</div> : <p className="text-sm text-muted-foreground">No active Quests right now.</p>}
  </section>;
}

export function QuestMilestones({ quests }: { quests: QuestView[] }) {
  const milestones = questMilestones(quests);
  return milestones.length ? <section aria-labelledby="quest-milestones-title" className="flex flex-col gap-2"><h2 id="quest-milestones-title" className="text-lg font-semibold">Making time to try and reflect</h2>
    <p className="text-sm text-muted-foreground">Each reflection adds something you can learn from, whatever the outcome.</p>
    <ul className="flex flex-col gap-2">{milestones.map((milestone) => <li key={milestone} className="flex items-center gap-2 text-sm"><Check aria-hidden="true" className="size-4" />{milestone}</li>)}</ul>
  </section> : null;
}

export function AssignQuestLink({ studentId, conversationId }: { studentId: string; conversationId?: string }) {
  return <Link href={`/mentor/students/${studentId}/quests/new${conversationId ? `?conversation=${encodeURIComponent(conversationId)}` : ""}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><FlaskConical data-icon="inline-start" />Assign Quest</Link>;
}

export function MentorQuests({ quests, studentId, now }: { quests: QuestView[]; studentId: string; now: Date }) {
  return <section id="quests" aria-labelledby="mentor-quests-title" className="flex min-w-0 scroll-mt-6 flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="mentor-quests-title" className="text-lg font-semibold">Quests</h2><AssignQuestLink studentId={studentId} /></div>
    <p className="text-sm text-muted-foreground">Small behavioural experiments. Reflection completes a Quest; it does not mean the strategy succeeded.</p>
    {!quests.length ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">No Quests assigned yet.</p> : (["ACTIVE", "COMPLETED", "CANCELLED"] as const).map((status) => {
      const items = quests.filter((quest) => quest.status === status);
      return items.length ? <section key={status} aria-labelledby={`mentor-quests-${status}`} className="flex flex-col gap-3"><h3 id={`mentor-quests-${status}`} className="font-medium">{questStatusLabels[status]}</h3>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">{items.map((quest) => <QuestCard key={quest.id} quest={quest} now={now} mentorStudentId={studentId} />)}</div></section> : null;
    })}
  </section>;
}
