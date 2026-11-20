import Link from "next/link";
import { CalendarRange, CheckCircle2, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSemesters } from "@/modules/admin/application/queries";
import { AdminEmptyState } from "@/modules/admin/ui/empty-state";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function SemestersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  await requireAdmin();
  const [parameters, semesters] = await Promise.all([searchParams, listSemesters()]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Semesters"
        description="Maintain programme periods. Activating one semester automatically deactivates the previous active semester."
        action={{ href: "/admin/semesters/new", label: "New semester", icon: Plus }}
      />
      {parameters.created || parameters.updated ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>
            Semester {parameters.created ? "created" : "updated"} successfully.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Semester history</CardTitle>
          <CardDescription>{semesters.length} semester{semesters.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {semesters.length === 0 ? (
            <AdminEmptyState
              icon={CalendarRange}
              title="No semesters yet"
              description="Create a semester before adding student accounts."
              action={{ href: "/admin/semesters/new", label: "Create semester" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semesters.map((semester) => (
                  <TableRow key={semester.id}>
                    <TableCell className="font-medium">{semester.name}</TableCell>
                    <TableCell>{semester.startDate.toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>{semester.endDate.toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>{semester._count.students}</TableCell>
                    <TableCell>
                      <Badge variant={semester.active ? "secondary" : "outline"}>
                        {semester.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/admin/semesters/${semester.id}/edit`} />}
                        nativeButton={false}
                      >
                        Edit
                      </Button>
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
