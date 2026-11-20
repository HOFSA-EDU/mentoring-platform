import { requireStudent } from "@/modules/auth/application/authorization";
import { getStudentAgreements } from "@/modules/mentoring/application/student-agreements";
import { StudentAgreements } from "@/modules/mentoring/ui/agreements";

export default async function StudentMentoringPage() {
  const student = await requireStudent();
  const agreements = await getStudentAgreements(student.id);
  return <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6"><header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold">Your agreements</h1>
    <p className="text-sm text-muted-foreground">The next steps you and your Mentor agreed on, newest first.</p></header><StudentAgreements agreements={agreements} /></div>;
}
