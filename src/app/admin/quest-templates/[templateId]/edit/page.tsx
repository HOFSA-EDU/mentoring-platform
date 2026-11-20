import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateQuestTemplateAction } from "@/modules/admin/application/actions";
import { getQuestTemplate } from "@/modules/admin/application/queries";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { QuestTemplateForm } from "@/modules/admin/ui/quest-template-form";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function EditQuestTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireAdmin();
  const { templateId } = await params;
  const template = await getQuestTemplate(templateId);

  if (!template) {
    notFound();
  }

  const action = updateQuestTemplateAction.bind(null, template.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`Edit ${template.title}`}
        description="Update the reusable experiment without assigning it to a student."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Template details</CardTitle>
          <CardDescription>Changes are recorded as an audit event.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuestTemplateForm action={action} mode="edit" defaultValues={template} />
        </CardContent>
      </Card>
    </div>
  );
}
