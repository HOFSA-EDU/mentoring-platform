import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { requireStudent } from "@/modules/auth/application/authorization";
import { getStudentCheckIn } from "@/modules/check-ins/application/queries";
import { CheckInOperationError } from "@/modules/check-ins/domain/errors";
import { formatSubmissionDate } from "@/modules/check-ins/ui/format";
import { domainLabels } from "@/modules/journey/domain/reflections";
import { ConversationState } from "@/modules/journey/ui/conversation-state";

export default async function StudentCheckInDetailPage({ params }: { params: Promise<{ checkInId: string }> }) {
  const student = await requireStudent();
  const { checkInId } = await params;
  let checkIn: Awaited<ReturnType<typeof getStudentCheckIn>>;

  try {
    checkIn = await getStudentCheckIn(student.id, checkInId);
  } catch (error) {
    if (error instanceof CheckInOperationError) notFound();
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 break-words">
      <Link href="/student/check-ins" className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />Back to history
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{checkIn.kind === "ONBOARDING" ? "Onboarding baseline" : checkIn.periodKey}</Badge>
          <Badge variant="secondary"><Check aria-hidden="true" />Completed</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{checkIn.kind === "ONBOARDING" ? "Your starting point" : "Weekly Check-in"}</h1>
        <p className="text-sm leading-6 text-muted-foreground">Submitted {formatSubmissionDate(checkIn.submittedAt)}. These are the questions and answers from that moment.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle><h2>Your answers</h2></CardTitle>
          <CardDescription>{checkIn.answers.length} answers saved with this reflection.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-5">
            {checkIn.answers.map((answer, index) => (
              <li key={`${checkIn.id}-${answer.sortOrder}`} className="flex flex-col gap-2">
                {index > 0 ? <Separator className="mb-3" /> : null}
                <p className="text-xs font-medium text-muted-foreground">{answer.domainSnapshot ? domainLabels[answer.domainSnapshot] : "Earlier reflection"}</p>
                <h3 className="text-sm font-medium leading-6">{answer.questionTextSnapshot}</h3>
                <p className="text-sm leading-6">{answer.optionLabelSnapshot}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      {checkIn.kind === "WEEKLY" ? (
        <section aria-labelledby="conversation-response-title">
          <Card>
            <CardHeader><CardTitle><h2 id="conversation-response-title">Your mentor conversation response</h2></CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ConversationState state={checkIn.mentorConversationRequest} />
              <p className="text-sm leading-6 text-muted-foreground">
                {checkIn.mentorConversationRequest === "YES"
                  ? "You requested a mentor conversation with this Check-in."
                  : checkIn.mentorConversationRequest === "MAYBE"
                    ? "You said a mentor conversation might help with this Check-in."
                    : "You did not request a mentor conversation with this Check-in."}
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
