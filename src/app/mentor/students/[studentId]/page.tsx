import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireMentor } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { getMentorStudentDetail } from "@/modules/mentor/application/queries";
import { getMentoringHistory } from "@/modules/mentoring/application/queries";
import { MentoringHistory, RecordConversationLink } from "@/modules/mentoring/ui/history";
import { listMentorQuests } from "@/modules/quests/application/queries";
import { MentorQuests } from "@/modules/quests/ui/quest-cards";
import { categoryLabels } from "@/modules/mentor/domain/presentation";
import { MentorEmpty, MentorSignal } from "@/modules/mentor/ui/student-list";
import { ObservationList, ObservationRefreshNotice } from "@/modules/observations/ui/observation-list";
import { formatSubmissionDate, formatSemesterDate } from "@/modules/check-ins/ui/format";

export default async function MentorStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const mentor = await requireMentor();
  const { studentId } = await params;
  let student: Awaited<ReturnType<typeof getMentorStudentDetail>>;
  let conversations: Awaited<ReturnType<typeof getMentoringHistory>>;
  let quests: Awaited<ReturnType<typeof listMentorQuests>>;
  try {
    student = await getMentorStudentDetail(mentor.id, studentId);
    [conversations, quests] = await Promise.all([getMentoringHistory(mentor.id, studentId), listMentorQuests(mentor.id, studentId)]);
  }
  catch (error) { if (error instanceof AuthorizationError) notFound(); throw error; }
  return <div className="flex min-w-0 flex-col gap-6 break-words">
    <Link href="/mentor/students" className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><ArrowLeft data-icon="inline-start" />Assigned students</Link>
    <header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold tracking-tight">{student.name}</h1>
      <p className="text-sm text-muted-foreground">{student.semester.name} · {student.completion}</p>
      <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{student.onboarded ? "Onboarding completed" : "Onboarding not completed"}</Badge>
        {student.latest ? <MentorSignal state={student.latest.conversation} /> : null}</div>
      <p className="text-sm text-muted-foreground">{student.latest ? `Latest response: ${student.latest.periodKey}, submitted ${formatSubmissionDate(student.latest.submittedAt)}.` : "No weekly Check-ins have been submitted in this semester."}</p>
    </header>
    <nav aria-label="Student sections" className="flex flex-wrap items-center gap-3">
      <RecordConversationLink studentId={studentId} />
      <Link className="px-2 py-3 text-sm underline underline-offset-4" href="#mentor-observations-title">Observations</Link>
      <Link className="px-2 py-3 text-sm underline underline-offset-4" href="#mentoring">Mentoring history</Link>
      <Link className="px-2 py-3 text-sm underline underline-offset-4" href="#quests">Quests</Link>
      <Link className="px-2 py-3 text-sm underline underline-offset-4" href="#mentor-history-title">Check-ins</Link>
    </nav>
    {student.observationRefreshFailed ? <ObservationRefreshNotice /> : null}
    <section aria-labelledby="mentor-observations-title" className="flex flex-col gap-3">
      <h2 id="mentor-observations-title" className="text-lg font-semibold">Observations</h2>
      <p className="text-sm text-muted-foreground">Formal records for mentoring, supported by saved responses. Acknowledged items remain active until resolved.</p>
      <ObservationList studentId={student.id} observations={student.observations} />
    </section>
    <MentoringHistory studentId={studentId} conversations={conversations} now={new Date()} />
    <MentorQuests studentId={studentId} quests={quests} now={new Date()} />
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section aria-labelledby="mentor-changes-title"><Card size="sm" className="h-full"><CardHeader><CardTitle><h2 id="mentor-changes-title">Recent changes</h2></CardTitle>
        <CardDescription>From comparable weekly responses in the last six weeks.</CardDescription></CardHeader><CardContent>
        {student.changes.length ? <ul className="flex flex-col gap-3">{student.changes.map((change) => <li key={change.domain}><h3 className="font-medium">{change.label}</h3><p className="text-sm leading-6 text-muted-foreground">{change.text}</p></li>)}</ul>
          : <p className="text-sm leading-6 text-muted-foreground">No clear directional change stands out. Some areas may still need more comparable answers.</p>}
      </CardContent></Card></section>
      <section aria-labelledby="mentor-journey-title"><Card size="sm" className="h-full"><CardHeader><CardTitle><h2 id="mentor-journey-title" className="flex items-center gap-2"><Compass aria-hidden="true" className="size-4" />Semester Journey · {student.journey.label}</h2></CardTitle>
        <CardDescription>{formatSemesterDate(student.semester.startDate)} – {formatSemesterDate(student.semester.endDate)}</CardDescription></CardHeader>
        <CardContent><p className="text-sm leading-6 text-muted-foreground">This stage follows the semester calendar. {student.journey.weekNumber ? `Currently study week ${student.journey.weekNumber}.` : "Today is outside the semester study weeks."}</p></CardContent></Card></section>
    </div>
    <section aria-labelledby="mentor-areas-title" className="flex flex-col gap-3"><h2 id="mentor-areas-title" className="text-lg font-semibold">Development areas</h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">{student.areas.map((area) => <Card size="sm" key={area.domain}>
        <CardHeader><CardTitle><h3>{area.label}</h3></CardTitle></CardHeader><CardContent className="flex flex-col items-start gap-2">
          <Badge variant="outline">{categoryLabels[area.category]}</Badge><p className="text-sm leading-6 text-muted-foreground">{area.text}</p>
        </CardContent></Card>)}</div>
    </section>
    <section aria-labelledby="mentor-history-title" className="flex flex-col gap-3"><h2 id="mentor-history-title" className="text-lg font-semibold">Check-in history</h2>
      {!student.history.length ? <MentorEmpty title="No weekly Check-ins yet" description="Submitted weekly reflections will appear here." /> :
        <ol className="flex flex-col divide-y rounded-xl border bg-card">{student.history.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-col items-start gap-2"><h3 className="font-medium">{entry.periodKey}</h3><p className="text-sm text-muted-foreground">{formatSubmissionDate(entry.submittedAt)} · {entry.answerCount} {entry.answerCount === 1 ? "answer" : "answers"}</p><MentorSignal state={entry.conversation} /></div>
          <Link href={`/mentor/students/${student.id}/check-ins/${entry.id}`} aria-label={`Open Check-in ${entry.periodKey}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
            Open Check-in<ArrowRight data-icon="inline-end" /></Link>
        </li>)}</ol>}
    </section>
    <section aria-labelledby="mentor-baseline-title"><Card size="sm"><CardHeader><CardTitle><h2 id="mentor-baseline-title">Starting point</h2></CardTitle>
      <CardDescription>{student.baseline ? `Onboarding submitted ${formatSubmissionDate(student.baseline.submittedAt)}.` : "Onboarding has not been completed yet."}</CardDescription></CardHeader>
      {student.baseline ? <><CardContent><dl className="flex flex-col gap-4">{student.baseline.answers.map((answer, index) => <div key={index} className="flex flex-col gap-1"><dt className="text-sm text-muted-foreground">{answer.question}</dt><dd>{answer.answer}</dd></div>)}</dl></CardContent>
        <CardFooter><Link href={`/mentor/students/${student.id}/check-ins/${student.baseline.id}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>View onboarding answers<ArrowRight data-icon="inline-end" /></Link></CardFooter></> : null}
    </Card></section>
  </div>;
}
