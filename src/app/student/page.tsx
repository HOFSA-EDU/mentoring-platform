import { requireStudent } from "@/modules/auth/application/authorization";
import { getStudentDashboardData } from "@/modules/check-ins/application/queries";
import { getStudentJourney } from "@/modules/journey/application/queries";
import { StudentJourneyDashboard } from "@/modules/journey/ui/student-journey-dashboard";
import Link from "next/link";
import { getStudentAgreements } from "@/modules/mentoring/application/student-agreements";
import { StudentAgreements } from "@/modules/mentoring/ui/agreements";
import { listStudentQuests } from "@/modules/quests/application/queries";
import { ActiveQuests } from "@/modules/quests/ui/quest-cards";

export default async function StudentPage() {
  const student = await requireStudent();
  const now = new Date();
  const [dashboard, reflection, agreements, quests] = await Promise.all([
    getStudentDashboardData(student.id, now),
    getStudentJourney(student.id, now),
    getStudentAgreements(student.id, 3),
    listStudentQuests(student.id),
  ]);

  return (
    <StudentJourneyDashboard
      name={student.name}
      dashboard={dashboard}
      reflection={reflection}
      activeQuests={<ActiveQuests quests={quests} now={now} />}
      sharedAgreements={<div className="flex flex-col gap-3"><StudentAgreements agreements={agreements} /><Link href="/student/mentoring" className="self-start py-3 text-sm underline underline-offset-4">View all agreements</Link></div>}
    />
  );
}
