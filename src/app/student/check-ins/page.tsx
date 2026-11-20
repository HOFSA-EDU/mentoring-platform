import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { requireStudent } from "@/modules/auth/application/authorization";
import { listStudentCheckIns } from "@/modules/check-ins/application/queries";
import { formatSubmissionDate } from "@/modules/check-ins/ui/format";
import { domainLabels } from "@/modules/journey/domain/reflections";
import { ConversationState } from "@/modules/journey/ui/conversation-state";

export default async function StudentCheckInHistoryPage() {
  const student = await requireStudent();
  const checkIns = await listStudentCheckIns(student.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 break-words">
      <Link href="/student" className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />Back to your week
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Check-in history</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Your reflections, most recent first. Open a Check-in to revisit the questions and answers as you saw them at the time.</p>
      </div>
      {checkIns.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ClipboardCheck aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No reflections submitted yet</EmptyTitle>
            <EmptyDescription>Your starting point and weekly Check-ins will appear here after you submit them.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/student" className={cn(buttonVariants(), "min-h-11")}>See your next step<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ol className="flex flex-col gap-4">
          {checkIns.map((checkIn) => {
            const areas = [...new Set(checkIn.answers.flatMap((answer) => answer.domainSnapshot ? [domainLabels[answer.domainSnapshot]] : []))];

            return (
              <li key={checkIn.id}>
                <Card>
                  <CardHeader>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{checkIn.kind === "ONBOARDING" ? "Onboarding baseline" : checkIn.periodKey}</Badge>
                      <Badge variant="secondary"><Check aria-hidden="true" />Completed</Badge>
                    </div>
                    <CardTitle><h2>{checkIn.kind === "ONBOARDING" ? "Your starting point" : "Weekly Check-in"}</h2></CardTitle>
                    <CardDescription>{formatSubmissionDate(checkIn.submittedAt)} · {checkIn.semester.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {checkIn.answers.length} answers saved{areas.length > 0 ? `, reflecting on ${areas.join(", ").toLowerCase()}.` : ". Open this reflection to revisit your answers."}
                    </p>
                    {checkIn.kind === "WEEKLY" ? <ConversationState state={checkIn.mentorConversationRequest} /> : null}
                  </CardContent>
                  <CardFooter>
                    <Link href={`/student/check-ins/${checkIn.id}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-auto")}>
                      Open reflection<ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
