import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireMentor } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { getMentorObservation } from "@/modules/observations/application/queries";
import { ObservationLifecycleForm } from "@/modules/observations/ui/lifecycle-form";
import { observationStatusLabels, observationTypeLabels } from "@/modules/observations/ui/observation-list";
import { domainLabels } from "@/modules/journey/domain/reflections";
import { formatSubmissionDate } from "@/modules/check-ins/ui/format";
import { RecordConversationLink } from "@/modules/mentoring/ui/history";

export default async function MentorObservationPage({ params }: { params: Promise<{ studentId: string; observationId: string }> }) {
  const actor = await requireMentor();
  const { studentId, observationId } = await params;
  let observation: Awaited<ReturnType<typeof getMentorObservation>>;
  try { observation = await getMentorObservation(actor.id, studentId, observationId); }
  catch (error) { if (error instanceof AuthorizationError) notFound(); throw error; }
  return <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5 break-words">
    <Link href={`/mentor/students/${studentId}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><ArrowLeft data-icon="inline-start" />Back to student</Link>
    <header className="flex flex-col gap-3"><p className="text-sm text-muted-foreground">{observation.student.user.name} · {observation.semester.name}</p>
      <h1 className="text-2xl font-semibold">{observation.title}</h1>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{observationStatusLabels[observation.status]}</Badge>
        <Badge variant={observation.type === "IMPROVEMENT" ? "secondary" : "outline"}>{observationTypeLabels[observation.type]}</Badge>
        <Badge variant="outline">{observation.domain ? domainLabels[observation.domain] : "Conversation"}</Badge></div>
      <p className="text-sm leading-6">{observation.summary}</p>
    </header>
    <RecordConversationLink studentId={studentId} observationId={observationId} />
    <Card size="sm"><CardHeader><CardTitle><h2>Observation history</h2></CardTitle>
      <CardDescription>Acknowledged means seen, not resolved. Resolution preserves the evidence.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4"><dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">First detected</dt><dd>{formatSubmissionDate(observation.firstDetectedAt)}</dd></div>
        <div><dt className="text-muted-foreground">Last supported by evidence</dt><dd>{formatSubmissionDate(observation.lastDetectedAt)}</dd></div>
        {observation.acknowledgedAt ? <div><dt className="text-muted-foreground">Acknowledged</dt><dd>{formatSubmissionDate(observation.acknowledgedAt)}</dd></div> : null}
        {observation.resolvedAt ? <div><dt className="text-muted-foreground">Resolved</dt><dd>{formatSubmissionDate(observation.resolvedAt)}</dd></div> : null}
      </dl><ObservationLifecycleForm studentId={studentId} observationId={observationId} status={observation.status} /></CardContent>
    </Card>
    <section aria-labelledby="observation-evidence-title" className="flex flex-col gap-3"><h2 id="observation-evidence-title" className="text-lg font-semibold">Why this Observation exists</h2>
      <p className="text-sm text-muted-foreground">These are the original submitted responses. Comparable responses can span weeks when a question was absent or answered neutrally.</p>
      <ol className="flex flex-col gap-3">{observation.evidence.map((entry) => <li key={entry.id}><Card size="sm">
        <CardHeader><CardTitle><h3>{entry.periodKey}</h3></CardTitle><CardDescription>{formatSubmissionDate(entry.submittedAt)}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3"><dl className="flex flex-col gap-1"><dt className="text-sm text-muted-foreground">{entry.questionTextSnapshot}</dt><dd>{entry.optionLabelSnapshot}</dd></dl>
          <Link href={`/mentor/students/${studentId}/check-ins/${entry.checkInId}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}>
            Open Check-in<ArrowRight data-icon="inline-end" /></Link>
        </CardContent></Card></li>)}</ol>
    </section>
  </div>;
}
