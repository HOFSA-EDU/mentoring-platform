import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/modules/auth/application/authorization";
import { submitOnboardingAction } from "@/modules/check-ins/application/actions";
import { getOnboardingPageData } from "@/modules/check-ins/application/queries";
import { ReflectionForm } from "@/modules/check-ins/ui/reflection-form";

export default async function StudentOnboardingPage() {
  const student = await requireStudent();
  const onboarding = await getOnboardingPageData(student.id);

  if (onboarding.completedCheckInId) {
    redirect("/student");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Badge variant="outline" className="self-start">One-time baseline</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your starting point</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose what usually happens in each situation. This is not a test and does not produce a score or diagnosis.
        </p>
      </div>
      <ReflectionForm
        action={submitOnboardingAction}
        questions={onboarding.questions}
        submitLabel="Complete onboarding"
        includeConversationRequest={false}
      />
    </div>
  );
}
