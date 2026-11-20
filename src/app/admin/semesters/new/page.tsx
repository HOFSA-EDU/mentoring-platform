import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSemesterAction } from "@/modules/admin/application/actions";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { SemesterForm } from "@/modules/admin/ui/semester-form";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function NewSemesterPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Create semester"
        description="Define a programme period and optionally make it the sole active semester."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Semester details</CardTitle>
          <CardDescription>End date must be later than the start date.</CardDescription>
        </CardHeader>
        <CardContent>
          <SemesterForm action={createSemesterAction} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
