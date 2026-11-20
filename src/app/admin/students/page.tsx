import Link from "next/link";
import { CheckCircle2, GraduationCap, Plus, Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setStudentActiveAction } from "@/modules/admin/application/actions";
import { listStudents } from "@/modules/admin/application/queries";
import { AdminEmptyState } from "@/modules/admin/ui/empty-state";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { ConfirmationAction } from "@/modules/admin/ui/confirmation-action";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; created?: string; updated?: string }>;
}) {
  await requireAdmin();
  const parameters = await searchParams;
  const query = parameters.q ?? "";
  const students = await listStudents(query);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Students"
        description="Create and maintain student accounts, semester membership, activation state, and current mentor visibility."
        action={{ href: "/admin/students/new", label: "New student", icon: Plus }}
      />

      {parameters.created || parameters.updated ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Student account {parameters.created ? "created" : "updated"} successfully.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Search students</CardTitle>
          <CardDescription>Search by student name or email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get">
            <FieldGroup className="sm:flex-row sm:items-end">
              <Field>
                <FieldLabel htmlFor="student-search">Name or email</FieldLabel>
                <Input id="student-search" name="q" defaultValue={query} />
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
          <CardTitle>Student accounts</CardTitle>
          <CardDescription>{students.length} matching account{students.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <AdminEmptyState
              icon={GraduationCap}
              title={query ? "No matching students" : "No students yet"}
              description={query ? "Try another name or email address." : "Create the first student account to begin programme setup."}
              action={query ? { href: "/admin/students", label: "Clear search" } : { href: "/admin/students/new", label: "Create student" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Current mentor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const active = student.user.active && student.active;
                  const currentAssignment = student.assignments[0];

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{student.user.name}</span>
                          <span className="text-xs text-muted-foreground">{student.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{student.semester.name}</TableCell>
                      <TableCell>{currentAssignment?.mentor.user.name ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={active ? "secondary" : "outline"}>
                          {active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            render={<Link href={`/admin/students/${student.id}/edit`} />}
                            nativeButton={false}
                          >
                            Edit
                          </Button>
                          <ConfirmationAction
                            action={setStudentActiveAction}
                            fields={{ userId: student.user.id, active: String(!active) }}
                            triggerLabel={active ? "Deactivate" : "Activate"}
                            title={`${active ? "Deactivate" : "Activate"} ${student.user.name}?`}
                            description={active ? "The student will no longer be able to sign in, and any active mentor assignment will be closed. Historical data remains." : "The student will be able to sign in again. Mentor assignment is not restored automatically."}
                            confirmLabel={active ? "Deactivate" : "Activate"}
                            variant={active ? "destructive" : "default"}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
