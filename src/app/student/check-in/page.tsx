import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/modules/auth/application/authorization";
import { submitWeeklyCheckInAction } from "@/modules/check-ins/application/actions";
import { getWeeklyCheckInPageData } from "@/modules/check-ins/application/queries";
import { ReflectionForm } from "@/modules/check-ins/ui/reflection-form";

export default async function WeeklyCheckInPage() {
  const student = await requireStudent();
  const checkIn = await getWeeklyCheckInPageData(student.id);

  if (checkIn.status === "ONBOARDING_REQUIRED") {
    redirect("/student/onboarding");
  }

  if (checkIn.status === "COMPLETED") {
    redirect("/student?checkIn=completed");
  }

  if (checkIn.status === "OUTSIDE_SEMESTER") {
    redirect("/student");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Badge variant="outline" className="self-start">{checkIn.period.periodKey}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Weekly Check-in</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Think only about this week. Choose the answer closest to what actually happened; there are no scores.
        </p>
      </div>
      <ReflectionForm
        action={submitWeeklyCheckInAction}
        questions={checkIn.questions}
        submitLabel="Submit Check-in"
        includeConversationRequest
      />
    </div>
  );
}
