import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSemesterAction } from "@/modules/admin/application/actions";
import { getSemester } from "@/modules/admin/application/queries";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { SemesterForm } from "@/modules/admin/ui/semester-form";
import { requireAdmin } from "@/modules/auth/application/authorization";

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function EditSemesterPage({
  params,
}: {
  params: Promise<{ semesterId: string }>;
}) {
  await requireAdmin();
  const { semesterId } = await params;
  const semester = await getSemester(semesterId);

  if (!semester) {
    notFound();
  }

  const action = updateSemesterAction.bind(null, semester.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`Edit ${semester.name}`}
        description="Date and activation changes are audited. Historical semesters are retained."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Semester details</CardTitle>
          <CardDescription>Making this active closes the previous active semester state atomically.</CardDescription>
        </CardHeader>
        <CardContent>
          <SemesterForm
            action={action}
            mode="edit"
            defaultValues={{
              name: semester.name,
              startDate: dateInputValue(semester.startDate),
              endDate: dateInputValue(semester.endDate),
              active: semester.active,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
