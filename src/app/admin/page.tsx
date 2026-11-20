import {
  BookOpenCheck,
  CalendarRange,
  FileQuestion,
  GraduationCap,
  ListChecks,
  UsersRound,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminOverview } from "@/modules/admin/application/queries";
import { AdminPageHeader } from "@/modules/admin/ui/admin-page-header";
import { requireAdmin } from "@/modules/auth/application/authorization";

export default async function AdminPage() {
  await requireAdmin();
  const overview = await getAdminOverview();
  const metrics = [
    {
      label: "Active students",
      value: overview.activeStudents,
      icon: GraduationCap,
    },
    {
      label: "Active mentors",
      value: overview.activeMentors,
      icon: UsersRound,
    },
    {
      label: "Active assignments",
      value: overview.activeAssignments,
      icon: BookOpenCheck,
    },
    {
      label: "Active questions",
      value: overview.activeQuestions,
      icon: FileQuestion,
    },
    {
      label: "Active Quest templates",
      value: overview.activeQuestTemplates,
      icon: ListChecks,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Administration overview"
        description="A concise view of the structural data that keeps the mentoring programme operational."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardDescription>{label}</CardDescription>
                <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}

        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardDescription>Current semester</CardDescription>
              <CalendarRange aria-hidden="true" className="size-4 text-muted-foreground" />
            </div>
            <CardTitle>{overview.activeSemester?.name ?? "None active"}</CardTitle>
          </CardHeader>
          {overview.activeSemester ? (
            <CardContent className="text-xs text-muted-foreground">
              {overview.activeSemester.startDate.toLocaleDateString("en-GB")} – {overview.activeSemester.endDate.toLocaleDateString("en-GB")}
            </CardContent>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
