import { requireStudent } from "@/modules/auth/application/authorization";
import { listStudentQuests } from "@/modules/quests/application/queries";
import { ActiveQuests, QuestCard, QuestMilestones } from "@/modules/quests/ui/quest-cards";

export default async function StudentQuestsPage() {
  const student = await requireStudent(); const quests = await listStudentQuests(student.id); const now = new Date();
  return <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 break-words">
    <header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold">Your Quests</h1><p className="text-sm text-muted-foreground">Try a small strategy, then notice what happens. These experiments are not graded.</p></header>
    <ActiveQuests quests={quests} now={now} /><QuestMilestones quests={quests} />
    {(["COMPLETED", "CANCELLED"] as const).map((status) => {
      const items = quests.filter((quest) => quest.status === status); const label = status === "COMPLETED" ? "Completed" : "Cancelled";
      return <section key={status} aria-labelledby={`quests-${status}`} className="flex flex-col gap-3"><h2 id={`quests-${status}`} className="text-lg font-semibold">{label}</h2>
        {items.length ? <div className="grid min-w-0 gap-3 md:grid-cols-2">{items.map((quest) => <QuestCard key={quest.id} quest={quest} now={now} />)}</div> : <p className="text-sm text-muted-foreground">No {label.toLowerCase()} Quests yet.</p>}
      </section>;
    })}
  </div>;
}
