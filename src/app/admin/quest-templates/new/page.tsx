import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuestTemplateAction } from "@/modules/admin/application/actions";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { QuestTemplateForm } from "@/modules/admin/ui/quest-template-form";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function NewQuestTemplatePage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Create Quest template"
        description="Define a reusable small behavioural experiment and its later reflection prompt."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Template details</CardTitle>
          <CardDescription>This creates a template only; it does not assign a Quest.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuestTemplateForm action={createQuestTemplateAction} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
