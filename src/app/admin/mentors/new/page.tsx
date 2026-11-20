import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createMentorAction } from "@/modules/admin/application/actions";
import { MentorForm } from "@/modules/admin/ui/account-forms";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function NewMentorPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Create mentor"
        description="Create a mentor account and profile atomically. Student assignments are managed separately."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Mentor details</CardTitle>
          <CardDescription>The role is set to Mentor by the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <MentorForm action={createMentorAction} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
