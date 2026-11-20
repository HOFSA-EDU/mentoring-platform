import { requireMentor } from "@/modules/auth/application/authorization";
import { listOpenFollowUps } from "@/modules/mentoring/application/queries";
import { followUpWindows, followUpWindowLabels } from "@/modules/mentoring/domain/calendar";
import { FollowUpList } from "@/modules/mentoring/ui/follow-up-list";

export default async function MentorFollowUpsPage() {
  const mentor = await requireMentor();
  const followUps = await listOpenFollowUps(mentor.id);
  return <div className="flex min-w-0 flex-col gap-6 break-words"><header className="flex flex-col gap-2"><h1 className="text-2xl font-semibold">Follow-ups</h1>
    <p className="text-sm text-muted-foreground">Internal reminders for your currently assigned students. Due soon means the next seven calendar days in Luxembourg.</p>
    <p className="text-sm text-muted-foreground">For a substantive conversation, record it separately in the student&apos;s mentoring history. Closed reminders remain in that history.</p></header>
    {!followUps.length ? <FollowUpList followUps={[]} /> : followUpWindows.map((window) => {
      const items = followUps.filter((item) => item.window === window);
      return items.length ? <section key={window} aria-labelledby={`follow-ups-${window}`} className="flex flex-col gap-3"><h2 id={`follow-ups-${window}`} className="text-lg font-semibold">{followUpWindowLabels[window]}</h2><FollowUpList followUps={items} /></section> : null;
    })}
  </div>;
}
