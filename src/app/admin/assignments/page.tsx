import { History, UserRoundCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deactivateAssignmentAction } from "@/modules/admin/application/actions";
import { getAssignmentManagementData } from "@/modules/admin/application/queries";
import { AdminEmptyState } from "@/modules/admin/ui/empty-state";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { AssignmentForm } from "@/modules/admin/ui/assignment-form";
import { ConfirmationAction } from "@/modules/admin/ui/confirmation-action";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function AssignmentsPage() {
  await requireAdmin();
  const { students, mentors, history } = await getAssignmentManagementData();
  const activeStudents = students.filter((student) => student.user.active);
  const currentAssignments = students.filter((student) => student.assignments.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Mentor assignments"
        description="Assign one current mentor per student while retaining every previous assignment as history."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Assign or change mentor</CardTitle>
          <CardDescription>
            Changing a mentor closes the current assignment and creates a new record in one transaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeStudents.length > 0 && mentors.length > 0 ? (
            <AssignmentForm
              students={activeStudents.map((student) => ({ id: student.id, name: student.user.name }))}
              mentors={mentors.map((mentor) => ({ id: mentor.id, name: mentor.user.name }))}
            />
          ) : (
            <AdminEmptyState
              icon={UserRoundCheck}
              title="Assignment setup is not ready"
              description="At least one active student and one active mentor are required."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current assignments</CardTitle>
          <CardDescription>{currentAssignments.length} active assignment{currentAssignments.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentAssignments.length === 0 ? (
            <AdminEmptyState
              icon={UserRoundCheck}
              title="No active assignments"
              description="Use the assignment form to connect an active student with an active mentor."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAssignments.map((student) => {
                  const assignment = student.assignments[0];

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{student.user.name}</TableCell>
                      <TableCell>{assignment.mentor.user.name}</TableCell>
                      <TableCell>{assignment.assignedAt.toLocaleDateString("en-GB")}</TableCell>
                      <TableCell><Badge variant="secondary">Active</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <ConfirmationAction
                            action={deactivateAssignmentAction}
                            fields={{ assignmentId: assignment.id }}
                            triggerLabel="Deactivate"
                            title="Deactivate this assignment?"
                            description="The student will become unassigned. This assignment remains in history and can be reviewed later."
                            confirmLabel="Deactivate assignment"
                            variant="destructive"
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

      <Card>
        <CardHeader>
          <CardTitle>Recent assignment history</CardTitle>
          <CardDescription>Closed assignments are retained and never overwritten.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <AdminEmptyState
              icon={History}
              title="No assignment history yet"
              description="Closed and replaced assignments will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Previous mentor</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.student.user.name}</TableCell>
                    <TableCell>{assignment.mentor.user.name}</TableCell>
                    <TableCell>{assignment.assignedAt.toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>{assignment.deactivatedAt?.toLocaleDateString("en-GB") ?? "—"}</TableCell>
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
