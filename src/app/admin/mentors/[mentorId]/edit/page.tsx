import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMentorAction } from "@/modules/admin/application/actions";
import { getMentor } from "@/modules/admin/application/queries";
import { MentorForm } from "@/modules/admin/ui/account-forms";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function EditMentorPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  await requireAdmin();
  const { mentorId } = await params;
  const mentor = await getMentor(mentorId);

  if (!mentor) {
    notFound();
  }

  const action = updateMentorAction.bind(null, mentor.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`Edit ${mentor.user.name}`}
        description="Update mentor identity details. Activation is managed from the mentor list."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Mentor details</CardTitle>
          <CardDescription>Changing details does not alter assignment history.</CardDescription>
        </CardHeader>
        <CardContent>
          <MentorForm
            action={action}
            mode="edit"
            defaultValues={{ name: mentor.user.name, email: mentor.user.email }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
