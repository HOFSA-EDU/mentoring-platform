import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireMentor } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { mentoringLocalTime } from "@/modules/mentoring/domain/calendar";
import { getQuestAssignmentForm } from "@/modules/quests/application/queries";
import { QuestAssignmentForm } from "@/modules/quests/ui/assignment-form";

export default async function AssignQuestPage({ params, searchParams }: {
  params: Promise<{ studentId: string }>; searchParams: Promise<{ conversation?: string | string[] }>;
}) {
  const mentor = await requireMentor(); const { studentId } = await params; const { conversation } = await searchParams;
  if (Array.isArray(conversation)) notFound();
  let data: Awaited<ReturnType<typeof getQuestAssignmentForm>>;
  try { data = await getQuestAssignmentForm(mentor.id, studentId, conversation); }
  catch (error) { if (error instanceof AuthorizationError) notFound(); throw error; }
  return <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 break-words">
    <Link href={`/mentor/students/${studentId}#quests`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><ArrowLeft data-icon="inline-start" />Back to student</Link>
    <header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold">Assign Quest</h1><p className="text-sm text-muted-foreground">{data.name} · One small strategy to try, followed by a short reflection.</p></header>
    <QuestAssignmentForm data={data} submissionKey={randomUUID()} today={mentoringLocalTime(new Date()).slice(0, 10)} prelinkedConversationId={conversation} />
  </div>;
}
