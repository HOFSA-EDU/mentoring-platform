import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createStudentAction } from "@/modules/admin/application/actions";
import { listSemesterOptions } from "@/modules/admin/application/queries";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { StudentForm } from "@/modules/admin/ui/account-forms";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function NewStudentPage() {
  await requireAdmin();
  const semesters = await listSemesterOptions();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Create student"
        description="Create a private student account and its programme profile in one transaction."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Student details</CardTitle>
          <CardDescription>The role is set to Student by the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm action={createStudentAction} semesters={semesters} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
