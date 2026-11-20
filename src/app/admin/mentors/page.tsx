import Link from "next/link";
import { CheckCircle2, Plus, Search, UsersRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setMentorActiveAction } from "@/modules/admin/application/actions";
import { listMentors } from "@/modules/admin/application/queries";
import { AdminEmptyState } from "@/modules/admin/ui/empty-state";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { ConfirmationAction } from "@/modules/admin/ui/confirmation-action";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; created?: string; updated?: string }>;
}) {
  await requireAdmin();
  const parameters = await searchParams;
  const query = parameters.q ?? "";
  const mentors = await listMentors(query);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Mentors"
        description="Maintain mentor accounts and see the number of students currently assigned to each mentor."
        action={{ href: "/admin/mentors/new", label: "New mentor", icon: Plus }}
      />
      {parameters.created || parameters.updated ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Mentor account {parameters.created ? "created" : "updated"} successfully.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Search mentors</CardTitle>
          <CardDescription>Search by mentor name or email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get">
            <FieldGroup className="sm:flex-row sm:items-end">
              <Field>
                <FieldLabel htmlFor="mentor-search">Name or email</FieldLabel>
                <Input id="mentor-search" name="q" defaultValue={query} />
              </Field>
              <Button type="submit">
                <Search data-icon="inline-start" />
                Search
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mentor accounts</CardTitle>
          <CardDescription>{mentors.length} matching account{mentors.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {mentors.length === 0 ? (
            <AdminEmptyState
              icon={UsersRound}
              title={query ? "No matching mentors" : "No mentors yet"}
              description={query ? "Try another name or email address." : "Create the first mentor account before assigning students."}
              action={query ? { href: "/admin/mentors", label: "Clear search" } : { href: "/admin/mentors/new", label: "Create mentor" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Assigned students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mentors.map((mentor) => (
                  <TableRow key={mentor.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{mentor.user.name}</span>
                        <span className="text-xs text-muted-foreground">{mentor.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{mentor._count.assignments}</TableCell>
                    <TableCell>
                      <Badge variant={mentor.user.active ? "secondary" : "outline"}>
                        {mentor.user.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link href={`/admin/mentors/${mentor.id}/edit`} />}
                          nativeButton={false}
                        >
                          Edit
                        </Button>
                        <ConfirmationAction
                          action={setMentorActiveAction}
                          fields={{ userId: mentor.user.id, active: String(!mentor.user.active) }}
                          triggerLabel={mentor.user.active ? "Deactivate" : "Activate"}
                          title={`${mentor.user.active ? "Deactivate" : "Activate"} ${mentor.user.name}?`}
                          description={mentor.user.active ? "The mentor will no longer be able to sign in, and active assignments will be closed without deleting history." : "The mentor will be able to sign in again. Previous assignments are not restored automatically."}
                          confirmLabel={mentor.user.active ? "Deactivate" : "Activate"}
                          variant={mentor.user.active ? "destructive" : "default"}
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
