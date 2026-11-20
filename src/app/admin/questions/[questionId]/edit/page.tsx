import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateQuestionAction } from "@/modules/admin/application/actions";
import { getQuestion } from "@/modules/admin/application/queries";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { QuestionForm } from "@/modules/admin/ui/question-form";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  await requireAdmin();
  const { questionId } = await params;
  const question = await getQuestion(questionId);

  if (!question) {
    notFound();
  }

  const action = updateQuestionAction.bind(null, question.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Edit question"
        description="Update wording, cadence, order, status, and answer options together."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{question.key}</CardTitle>
          <CardDescription>All option changes are stored atomically with the question update.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionForm
            action={action}
            mode="edit"
            defaultValues={question}
          />
        </CardContent>
      </Card>
    </div>
  );
}
