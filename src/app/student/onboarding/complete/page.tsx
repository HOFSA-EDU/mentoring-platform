import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/modules/auth/application/authorization";
import { getSubmissionConfirmation } from "@/modules/check-ins/application/queries";
import { CheckInOperationError } from "@/modules/check-ins/domain/errors";

export default async function OnboardingCompletePage({
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

  if (confirmation.kind !== "ONBOARDING") {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Alert>
        <CheckCircle2 aria-hidden="true" />
        <AlertTitle>Onboarding complete</AlertTitle>
        <AlertDescription>Your baseline has been saved and cannot be edited.</AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>A cautious starting reflection</CardTitle>
          <CardDescription>
            These statements repeat what you reported. Future Check-ins will show whether the same situations continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-3 pl-5 text-sm leading-6">
            {confirmation.feedback.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </CardContent>
        <CardFooter>
          <Button render={<Link href="/student" />} nativeButton={false}>
            Continue to your dashboard
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
