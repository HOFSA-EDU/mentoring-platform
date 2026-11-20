import { requireMentor } from "@/modules/auth/application/authorization";
import { listMentorStudents } from "@/modules/mentor/application/queries";
import { MentorStudentList } from "@/modules/mentor/ui/student-list";
import { StudentFilters } from "@/modules/mentor/ui/student-filters";
import { ObservationRefreshNotice } from "@/modules/observations/ui/observation-list";

export default async function MentorStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const mentor = await requireMentor();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const signal = typeof params.signal === "string" && ["YES", "MAYBE", "NO"].includes(params.signal) ? params.signal : "ALL";
  const change = params.change === "MORE_DIFFICULT" ? "MORE_DIFFICULT" : "ALL";
  const all = await listMentorStudents(mentor.id);
  const students = all.filter((student) => student.name.toLocaleLowerCase("en").includes(query.toLocaleLowerCase("en")) &&
    (signal === "ALL" || student.recentSignal === signal) && (change === "ALL" || student.hasNegativeChange));
  return <div className="flex min-w-0 flex-col gap-5 break-words">
    <header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold tracking-tight">Assigned students</h1>
      <p className="text-sm text-muted-foreground">Search your current assignments. Conversation filters cover this and last week.</p></header>
    <StudentFilters key={`${query}-${signal}-${change}`} query={query} signal={signal} change={change} />
    {all.some((student) => student.observationRefreshFailed) ? <ObservationRefreshNotice /> : null}
    <p className="text-sm text-muted-foreground">{students.length} of {all.length} assigned students</p>
    <section aria-label="Assigned student results"><MentorStudentList students={students}
      emptyTitle={all.length ? "No matching students" : "No assigned students yet"}
      emptyDescription={all.length ? "Try another name or reset the filters." : "An administrator can assign students to you."} /></section>
  </div>;
}
