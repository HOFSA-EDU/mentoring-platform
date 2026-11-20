import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireMentor } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { getMentorCheckIn } from "@/modules/mentor/application/queries";
import { MentorSignal } from "@/modules/mentor/ui/student-list";
import { domainLabels } from "@/modules/journey/domain/reflections";
import { formatSubmissionDate } from "@/modules/check-ins/ui/format";

export default async function MentorCheckInPage({ params }: { params: Promise<{ studentId: string; checkInId: string }> }) {
  const mentor = await requireMentor();
  const { studentId, checkInId } = await params;
  let entry: Awaited<ReturnType<typeof getMentorCheckIn>>;
  try { entry = await getMentorCheckIn(mentor.id, studentId, checkInId); }
  catch (error) { if (error instanceof AuthorizationError) notFound(); throw error; }
  return <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5 break-words">
    <Link href={`/mentor/students/${studentId}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><ArrowLeft data-icon="inline-start" />Back to student</Link>
    <header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold">{entry.kind === "ONBOARDING" ? "Onboarding baseline" : entry.periodKey}</h1>
      <p className="text-sm text-muted-foreground">{entry.student.user.name} · {entry.semester.name}</p>
      <p className="text-sm text-muted-foreground">Submitted {formatSubmissionDate(entry.submittedAt)}. Original questions and answers are preserved.</p>
      {entry.kind === "WEEKLY" ? <MentorSignal state={entry.mentorConversationRequest} /> : null}</header>
    <Card><CardHeader><CardTitle><h2>Submitted answers</h2></CardTitle><CardDescription>The student&apos;s responses from that moment.</CardDescription></CardHeader>
      <CardContent><dl className="flex flex-col divide-y">{entry.answers.map((answer) => <div key={answer.sortOrder} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
        <dt className="flex flex-col gap-2"><span className="text-xs text-muted-foreground">{answer.domainSnapshot ? domainLabels[answer.domainSnapshot] : "Earlier reflection"}</span><span>{answer.questionTextSnapshot}</span></dt>
        <dd className="font-medium">{answer.optionLabelSnapshot}</dd>
      </div>)}</dl></CardContent></Card>
  </div>;
}
