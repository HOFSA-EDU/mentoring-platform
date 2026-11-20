import Link from "next/link";
import { CheckCircle2, Filter, ListChecks, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setQuestTemplateActiveAction } from "@/modules/admin/application/actions";
import { listQuestTemplates } from "@/modules/admin/application/queries";
import { developmentDomains } from "@/modules/admin/domain/schemas";
import { AdminEmptyState } from "@/modules/admin/ui/empty-state";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { ConfirmationAction } from "@/modules/admin/ui/confirmation-action";
import { domainLabels } from "@/modules/admin/ui/domain-labels";
import { SelectField } from "@/modules/admin/ui/form-controls";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function QuestTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; created?: string; updated?: string }>;
}) {
  await requireAdmin();
  const parameters = await searchParams;
  const templates = await listQuestTemplates(parameters.domain);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Quest templates"
        description="Manage reusable behavioural experiments. Templates are not assigned to students in this phase."
        action={{ href: "/admin/quest-templates/new", label: "New template", icon: Plus }}
      />
      {parameters.created || parameters.updated ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Quest template {parameters.created ? "created" : "updated"} successfully.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Filter templates</CardTitle>
          <CardDescription>Limit the list to one development domain.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get">
            <FieldGroup className="sm:flex-row sm:items-end">
              <SelectField
                id="template-filter-domain"
                name="domain"
                label="Domain"
                defaultValue={parameters.domain ?? "all"}
                placeholder="All domains"
                options={[
                  { value: "all", label: "All domains" },
                  ...developmentDomains.map((domain) => ({ value: domain, label: domainLabels[domain] })),
                ]}
              />
              <Button type="submit">
                <Filter data-icon="inline-start" />
                Apply filter
              </Button>
              <Button variant="outline" render={<Link href="/admin/quest-templates" />} nativeButton={false}>
                Reset
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Template library</CardTitle>
          <CardDescription>{templates.length} matching template{templates.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <AdminEmptyState
              icon={ListChecks}
              title="No matching Quest templates"
              description="Reset the filter or create a small behavioural experiment."
              action={{ href: "/admin/quest-templates/new", label: "Create template" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="max-w-lg whitespace-normal">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{template.title}</span>
                        <span className="text-sm leading-5 text-muted-foreground">{template.description}</span>
                        <span className="text-xs text-muted-foreground">{template.key}</span>
                      </div>
                    </TableCell>
                    <TableCell>{domainLabels[template.domain]}</TableCell>
                    <TableCell>{template.defaultDurationDays} days</TableCell>
                    <TableCell>
                      <Badge variant={template.active ? "secondary" : "outline"}>
                        {template.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link href={`/admin/quest-templates/${template.id}/edit`} />}
                          nativeButton={false}
                        >
                          Edit
                        </Button>
                        <ConfirmationAction
                          action={setQuestTemplateActiveAction}
                          fields={{ id: template.id, active: String(!template.active) }}
                          triggerLabel={template.active ? "Deactivate" : "Activate"}
                          title={`${template.active ? "Deactivate" : "Activate"} ${template.title}?`}
                          description={template.active ? "The template will no longer be available for future Quest assignment, but it remains in the library." : "The template will become available for future Quest assignment."}
                          confirmLabel={template.active ? "Deactivate" : "Activate"}
                          variant={template.active ? "destructive" : "default"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
