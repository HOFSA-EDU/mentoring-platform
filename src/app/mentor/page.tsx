import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireMentor } from "@/modules/auth/application/authorization";
import { listMentorStudents } from "@/modules/mentor/application/queries";
import { MentorStudentList } from "@/modules/mentor/ui/student-list";
import { ObservationRefreshNotice } from "@/modules/observations/ui/observation-list";
import { listOpenFollowUps } from "@/modules/mentoring/application/queries";
import { FollowUpList } from "@/modules/mentoring/ui/follow-up-list";

export default async function MentorPage() {
  const mentor = await requireMentor();
  const students = await listMentorStudents(mentor.id);
  const followUps = await listOpenFollowUps(mentor.id);
  const attention = students.filter((student) => student.attentionState !== "NORMAL" || student.recentSignal === "MAYBE" || student.attention === "OVERDUE_FOLLOW_UP" || student.attention === "DUE_FOLLOW_UP");
  const counts = [
    { label: "Assigned students", count: students.length },
    { label: "Conversation", count: students.filter((student) => student.attentionState === "CONVERSATION").length },
    { label: "Observations to review", count: students.filter((student) => student.attentionState === "WATCH").length },
    { label: "Maybe conversation", count: students.filter((student) => student.recentSignal === "MAYBE").length },
    { label: "Due follow-ups", count: followUps.filter((item) => item.window !== "LATER").length },
  ];
  return <div className="flex min-w-0 flex-col gap-6 break-words">
    <header className="flex flex-col gap-2"><p className="text-sm text-muted-foreground">Mentor workspace</p>
      <h1 className="text-2xl font-semibold tracking-tight">Your mentoring week</h1>
      <p className="text-sm text-muted-foreground">Review your assigned students&apos; recent responses and what they reported changing.</p></header>
    <dl className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl border bg-card p-4">{counts.map((item) => <div key={item.label} className="flex items-baseline gap-2">
      <dt className="text-sm text-muted-foreground">{item.label}</dt><dd className="text-xl font-semibold">{item.count}</dd></div>)}</dl>
    <section aria-labelledby="attention-title" className="flex flex-col gap-3">
      <h2 id="attention-title" className="text-lg font-semibold">Needs attention</h2>
      <p className="text-sm text-muted-foreground">Overdue follow-ups first, then conversation requests, follow-ups due today or within seven days, unresolved difficulty Observations, and soft Maybe responses.</p>
      {students.some((student) => student.observationRefreshFailed) ? <ObservationRefreshNotice /> : null}
      <MentorStudentList students={attention} emptyTitle={students.length ? "No current attention signals" : "No assigned students yet"}
        emptyDescription={students.length ? "You can still review every assigned student below." : "Students will appear here when an administrator assigns them to you."} />
    </section>
    <section aria-labelledby="due-follow-ups-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="due-follow-ups-title" className="text-lg font-semibold">Due follow-ups</h2>
        <Link href="/mentor/follow-ups" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>All follow-ups<ArrowRight data-icon="inline-end" /></Link></div>
      <FollowUpList followUps={followUps.filter((item) => item.window !== "LATER")} />
    </section>
    <section aria-labelledby="all-students-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="all-students-title" className="text-lg font-semibold">All assigned students</h2>
        <Link href="/mentor/students" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Search students<ArrowRight data-icon="inline-end" /></Link></div>
      <MentorStudentList students={students} emptyTitle="No assigned students yet" emptyDescription="Your current assignments will appear here." />
    </section>
  </div>;
}
