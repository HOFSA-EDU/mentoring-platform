import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateStudentAction } from "@/modules/admin/application/actions";
import { getStudent, listSemesterOptions } from "@/modules/admin/application/queries";
import { StudentForm } from "@/modules/admin/ui/account-forms";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireAdmin();
  const { studentId } = await params;
  const [student, semesters] = await Promise.all([
    getStudent(studentId),
    listSemesterOptions(),
  ]);

  if (!student) {
    notFound();
  }

  const action = updateStudentAction.bind(null, student.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`Edit ${student.user.name}`}
        description="Update identity details and semester membership. Account activation is managed from the student list."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Student details</CardTitle>
          <CardDescription>Password hashes and role values are never exposed here.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm
            action={action}
            semesters={semesters}
            mode="edit"
            defaultValues={{
              name: student.user.name,
              email: student.user.email,
              semesterId: student.semesterId,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
