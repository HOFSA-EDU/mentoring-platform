import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireMentor } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { getConversationFormData } from "@/modules/mentoring/application/queries";
import { mentoringLocalTime } from "@/modules/mentoring/domain/calendar";
import { ConversationForm } from "@/modules/mentoring/ui/conversation-form";

export default async function NewConversationPage({ params, searchParams }: {
  params: Promise<{ studentId: string }>; searchParams: Promise<{ observation?: string | string[] }>;
}) {
  const mentor = await requireMentor();
  const { studentId } = await params;
  const { observation } = await searchParams;
  if (Array.isArray(observation)) notFound();
  let data: Awaited<ReturnType<typeof getConversationFormData>>;
  try { data = await getConversationFormData(mentor.id, studentId, observation); }
  catch (error) { if (error instanceof AuthorizationError) notFound(); throw error; }
  return <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 break-words">
    <Link href={`/mentor/students/${studentId}#mentoring`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><ArrowLeft data-icon="inline-start" />Back to student</Link>
    <header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold">Record conversation</h1><p className="text-sm text-muted-foreground">{data.name}</p></header>
    <ConversationForm data={data} submissionKey={randomUUID()} defaultOccurredAt={mentoringLocalTime(new Date())} prelinkedId={observation} />
  </div>;
}
