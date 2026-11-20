import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuestionAction } from "@/modules/admin/application/actions";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { QuestionForm } from "@/modules/admin/ui/question-form";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function NewQuestionPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Create question"
        description="Add a concrete, behaviour-based prompt and its ordered answer options."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Question configuration</CardTitle>
          <CardDescription>Internal direction values are never shown in student or mentor interfaces.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionForm action={createQuestionAction} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
