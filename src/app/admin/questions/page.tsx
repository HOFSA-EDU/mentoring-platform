import Link from "next/link";
import { CheckCircle2, FileQuestion, Filter, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setQuestionActiveAction } from "@/modules/admin/application/actions";
import { listQuestions } from "@/modules/admin/application/queries";
import { developmentDomains, questionContexts } from "@/modules/admin/domain/schemas";
import { AdminEmptyState } from "@/modules/admin/ui/empty-state";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { ConfirmationAction } from "@/modules/admin/ui/confirmation-action";
import { domainLabels, questionContextLabels, questionTypeLabels } from "@/modules/admin/ui/domain-labels";
import { SelectField } from "@/modules/admin/ui/form-controls";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    domain?: string;
    context?: string;
    active?: string;
    stable?: string;
    created?: string;
    updated?: string;
  }>;
}) {
  await requireAdmin();
  const parameters = await searchParams;
  const questions = await listQuestions(parameters);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Check-in questions"
        description="Manage the behaviour-based question library and internal answer direction values. Weekly scheduling is not part of this phase."
        action={{ href: "/admin/questions/new", label: "New question", icon: Plus }}
      />
      {parameters.created || parameters.updated ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Question {parameters.created ? "created" : "updated"} successfully.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Filter questions</CardTitle>
          <CardDescription>Filter by domain, status, or stable cadence.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get">
            <FieldGroup className="sm:grid sm:grid-cols-4">
              <SelectField
                id="question-filter-domain"
                name="domain"
                label="Domain"
                defaultValue={parameters.domain ?? "all"}
                placeholder="All domains"
                options={[
                  { value: "all", label: "All domains" },
                  ...developmentDomains.map((domain) => ({ value: domain, label: domainLabels[domain] })),
                ]}
              />
              <SelectField
                id="question-filter-context"
                name="context"
                label="Use in"
                defaultValue={parameters.context ?? "all"}
                placeholder="All workflows"
                options={[
                  { value: "all", label: "All workflows" },
                  ...questionContexts.map((context) => ({ value: context, label: questionContextLabels[context] })),
                ]}
              />
              <SelectField
                id="question-filter-active"
                name="active"
                label="Status"
                defaultValue={parameters.active ?? "all"}
                placeholder="All statuses"
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
              />
              <SelectField
                id="question-filter-stable"
                name="stable"
                label="Cadence"
                defaultValue={parameters.stable ?? "all"}
                placeholder="All cadences"
                options={[
                  { value: "all", label: "All cadences" },
                  { value: "true", label: "Stable" },
                  { value: "false", label: "Rotating" },
                ]}
              />
              <div className="flex gap-2 sm:col-span-4">
                <Button type="submit">
                  <Filter data-icon="inline-start" />
                  Apply filters
                </Button>
                <Button variant="outline" render={<Link href="/admin/questions" />} nativeButton={false}>
                  Reset
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Question library</CardTitle>
          <CardDescription>{questions.length} matching question{questions.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <AdminEmptyState
              icon={FileQuestion}
              title="No matching questions"
              description="Reset the filters or create a new behaviour-based question."
              action={{ href: "/admin/questions/new", label: "Create question" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Use in</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell>{question.sortOrder}</TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium leading-5">{question.text}</span>
                        <span className="text-xs text-muted-foreground">{question.key}</span>
                      </div>
                    </TableCell>
                    <TableCell>{domainLabels[question.domain]}</TableCell>
                    <TableCell>{questionContextLabels[question.context]}</TableCell>
                    <TableCell>{questionTypeLabels[question.type]}</TableCell>
                    <TableCell>
                      {question.context === "WEEKLY"
                        ? question.stable ? "Stable" : "Rotating"
                        : "Not applicable"}
                    </TableCell>
                    <TableCell>{question._count.options}</TableCell>
                    <TableCell>
                      <Badge variant={question.active ? "secondary" : "outline"}>
                        {question.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link href={`/admin/questions/${question.id}/edit`} />}
                          nativeButton={false}
                        >
                          Edit
                        </Button>
                        <ConfirmationAction
                          action={setQuestionActiveAction}
                          fields={{ id: question.id, active: String(!question.active) }}
                          triggerLabel={question.active ? "Deactivate" : "Activate"}
                          title={`${question.active ? "Deactivate" : "Activate"} this question?`}
                          description={question.active ? "It will leave the active question pool but remain available as historical configuration." : "It will return to the active question pool."}
                          confirmLabel={question.active ? "Deactivate" : "Activate"}
                          variant={question.active ? "destructive" : "default"}
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
