import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageCircleMore } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/modules/auth/application/authorization";
import { getSubmissionConfirmation } from "@/modules/check-ins/application/queries";
import { CheckInOperationError } from "@/modules/check-ins/domain/errors";

export default async function CheckInCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ submission?: string }>;
}) {
  const student = await requireStudent();
  const { submission } = await searchParams;

  if (!submission) {
    notFound();
  }

  let confirmation: Awaited<ReturnType<typeof getSubmissionConfirmation>>;

  try {
    confirmation = await getSubmissionConfirmation(student.id, submission);
  } catch (error) {
    if (error instanceof CheckInOperationError) {
      notFound();
    }

    throw error;
  }

  if (confirmation.kind !== "WEEKLY") {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Alert>
        <CheckCircle2 aria-hidden="true" />
        <AlertTitle>Check-in complete</AlertTitle>
        <AlertDescription>Your answers for {confirmation.periodKey} are saved as an immutable reflection.</AlertDescription>
      </Alert>
      {confirmation.mentorConversationRequest !== "NO" ? (
        <Card>
          <CardHeader>
            <MessageCircleMore aria-hidden="true" />
            <CardTitle>{confirmation.mentorConversationRequest === "YES" ? "Conversation requested" : "Conversation might help"}</CardTitle>
            <CardDescription>
              {confirmation.mentorConversationRequest === "YES"
                ? "Your request was recorded. You do not need to explain the reason in the platform."
                : "You said a conversation might help. This was saved as Maybe, not a conversation request."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Thank you for taking a moment to reflect</CardTitle>
          <CardDescription>
            This Check-in is complete. Your dashboard now shows this week&apos;s completion state.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2">
          <Button render={<Link href="/student" />} nativeButton={false}>
            Return to dashboard
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button variant="outline" render={<Link href="/student/check-ins" />} nativeButton={false}>
            View history
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
