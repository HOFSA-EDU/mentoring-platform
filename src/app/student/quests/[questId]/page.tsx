import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireStudent } from "@/modules/auth/application/authorization";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { formatSemesterDate, formatSubmissionDate } from "@/modules/check-ins/ui/format";
import { domainLabels } from "@/modules/journey/domain/reflections";
import { getStudentQuest } from "@/modules/quests/application/queries";
import { QuestReflectionSummary, QuestStatus } from "@/modules/quests/ui/quest-cards";
import { QuestReflectionForm } from "@/modules/quests/ui/reflection-form";
import { isQuestOverdue } from "@/modules/quests/domain/presentation";

export default async function StudentQuestPage({ params }: { params: Promise<{ questId: string }> }) {
  const student = await requireStudent(); const { questId } = await params; const now = new Date();
  let quest: Awaited<ReturnType<typeof getStudentQuest>>;
  try { quest = await getStudentQuest(student.id, questId); }
  catch (error) { if (error instanceof AuthorizationError) notFound(); throw error; }
  return <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-5 break-words">
    <Link href="/student/quests" className={cn(buttonVariants({ variant: "outline" }), "min-h-11 self-start")}><ArrowLeft data-icon="inline-start" />Your Quests</Link>
    <header className="flex flex-col gap-3"><QuestStatus quest={quest} now={now} /><h1 className="text-2xl font-semibold">{quest.title}</h1><p className="text-sm text-muted-foreground">{domainLabels[quest.domain]}</p></header>
    <Card size="sm"><CardHeader><CardTitle><h2>Your experiment</h2></CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
      <p className="whitespace-pre-wrap leading-7">{quest.description}</p><dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Assigned</dt><dd>{formatSubmissionDate(quest.assignedAt)}</dd></div><div><dt className="text-muted-foreground">Try it by</dt><dd>{formatSemesterDate(quest.dueAt)}</dd></div></dl>
      {isQuestOverdue(quest, now) ? <p className="text-sm text-muted-foreground">The suggested date has passed. You can still try this experiment or reflect on what happened.</p> : null}
    </CardContent></Card>
    {quest.sharedAgreement ? <Card size="sm"><CardHeader><CardTitle><h2>Agreed with your Mentor</h2></CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6">{quest.sharedAgreement.text}</p></CardContent></Card> : null}
    {quest.status === "ACTIVE" ? <section aria-labelledby="quest-reflection-title" className="flex flex-col gap-4"><h2 id="quest-reflection-title" className="text-lg font-semibold">Ready to reflect?</h2><QuestReflectionForm questId={quest.id} prompt={quest.reflectionPromptSnapshot} /></section>
      : quest.reflection ? <section aria-labelledby="saved-quest-reflection-title" className="flex flex-col gap-3"><h2 id="saved-quest-reflection-title" className="text-lg font-semibold">Your reflection is saved</h2>
        <p className="text-sm text-muted-foreground">This Quest is completed because you took time to reflect, regardless of whether the strategy helped.</p><QuestReflectionSummary reflection={quest.reflection} /></section>
        : <p className="rounded-xl border p-4 text-sm text-muted-foreground">Your Mentor cancelled this Quest. It is no longer active and stays here in your history.</p>}
  </div>;
}
