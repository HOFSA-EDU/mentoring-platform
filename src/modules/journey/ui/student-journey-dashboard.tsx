import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, Check, ClipboardCheck, Compass, History, MessageCircleMore } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { getStudentDashboardData } from "@/modules/check-ins/application/queries";
import { formatSemesterDate, formatSubmissionDate } from "@/modules/check-ins/ui/format";
import type { getStudentJourney } from "@/modules/journey/application/queries";
import { ConversationState } from "@/modules/journey/ui/conversation-state";

type Dashboard = Awaited<ReturnType<typeof getStudentDashboardData>>;
type Reflection = Awaited<ReturnType<typeof getStudentJourney>>;

const reflectionLabels: Record<string, string> = {
  STABLE: "Fairly consistent",
  IMPROVING: "Reported as easier",
  MORE_DIFFICULT: "Reported as harder",
  NOT_ENOUGH_DATA: "Building a picture",
  MIXED: "Mixed answers",
};

function WeeklyAction({ dashboard }: { dashboard: Dashboard }) {
  const weeklyReady = Boolean(dashboard.onboarding && dashboard.period);
  const onboardingReady = !dashboard.onboarding && dashboard.semester.active;
  const completed = dashboard.currentCheckIn;
  const actionHref = completed
    ? "/student/check-ins"
    : weeklyReady
      ? "/student/check-in"
      : onboardingReady
        ? "/student/onboarding"
        : "/student/check-ins";

  return (
    <section aria-labelledby="weekly-action-title">
      <Card>
        <CardHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={completed ? "secondary" : "outline"}>{completed ? "Completed" : "Your next step"}</Badge>
            {dashboard.period ? <span className="text-xs text-muted-foreground">Study week {dashboard.period.studyWeekNumber}</span> : null}
          </div>
          <CardTitle>
            <h2 id="weekly-action-title">
              {completed
                ? "Check-in completed this week"
                : weeklyReady
                  ? "Your weekly Check-in is ready"
                  : onboardingReady
                    ? "Complete onboarding before your first Check-in"
                    : "Weekly Check-in is not currently available"}
            </h2>
          </CardTitle>
          <CardDescription>
            {completed
              ? `Submitted ${formatSubmissionDate(completed.submittedAt)}. Take a moment to look back at what you reported.`
              : weeklyReady
                ? "Five short questions about your week, then a chance to say whether a mentor conversation would help."
                : onboardingReady
                  ? "Begin with 10 situational questions. This one-time reflection gives you a starting point for the weeks ahead."
                  : dashboard.semester.active
                    ? "Weekly Check-ins are available during your semester dates. You can still revisit your submitted reflections."
                    : "Your semester is not currently active. Your submitted reflections are still here to revisit."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={actionHref} className={cn(buttonVariants({ variant: completed || (!weeklyReady && !onboardingReady) ? "outline" : "default" }), "min-h-11 w-full sm:w-auto")}>
            {completed ? "View history" : weeklyReady ? "Start Check-in" : onboardingReady ? "Begin onboarding" : "View history"}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}

function RecentReflections({ reflection, hasOnboarding }: { reflection: Reflection; hasOnboarding: boolean }) {
  const { recentChanges, comparisons } = reflection.reflections;
  const count = reflection.continuity.weeklyCount;

  return (
    <section aria-labelledby="recent-changes-title">
      <Card>
        <CardHeader>
          <CardTitle><h2 id="recent-changes-title">What changed recently?</h2></CardTitle>
          <CardDescription>A look at what you reported in your recent weekly Check-ins.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {recentChanges.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {recentChanges.slice(0, 2).map((change) => (
                <li key={change.domain} className="flex flex-col gap-1">
                  <h3 className="font-medium">{change.label}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{change.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {!hasOnboarding
                ? "Start with onboarding. Your weekly reflections will build a picture of your experience over time."
                : count === 0
                  ? "Your starting point is saved. After a few weekly Check-ins, you can begin to notice what stays similar and what changes."
                  : count === 1
                    ? "Your first weekly Check-in is saved. A few more comparable answers will help you see what changes over time."
                    : "No major change stands out from your recent Check-ins. Some areas may still need more comparable answers."}
            </p>
          )}
          {comparisons.length > 0 ? (
            <>
              <Separator />
              <details>
                <summary className="min-h-11 cursor-pointer rounded-md py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Compare your last two Check-ins</summary>
                <div className="flex flex-col gap-5 pb-2 pt-3">
                  {comparisons.map((comparison, index) => (
                    <div key={`${comparison.domain}-${index}`} className="flex flex-col gap-2">
                      <h3 className="font-medium">{comparison.label}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{comparison.questionText}</p>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <dt className="text-xs text-muted-foreground">Previous Check-in · {comparison.previousPeriod}</dt>
                          <dd className="text-sm">{comparison.previousAnswer}</dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-xs text-muted-foreground">Latest Check-in · {comparison.currentPeriod}</dt>
                          <dd className="text-sm">{comparison.currentAnswer}</dd>
                        </div>
                      </dl>
                      <p className="text-sm leading-6 text-muted-foreground">{comparison.text}</p>
                      {index < comparisons.length - 1 ? <Separator /> : null}
                    </div>
                  ))}
                </div>
              </details>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function SemesterJourney({ reflection }: { reflection: Reflection }) {
  const { semester, journey } = reflection;

  return (
    <section id="semester-journey" aria-labelledby="semester-journey-title" className="scroll-mt-24">
      <Card className="h-full">
        <CardHeader>
          <Compass aria-hidden="true" />
          <CardTitle><h2 id="semester-journey-title">Semester Journey</h2></CardTitle>
          <CardDescription>{semester.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">{journey.label}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{journey.description}</p>
          </div>
          <Progress value={journey.progress} aria-valuetext={`${journey.progress}% of semester time elapsed`}>
            <ProgressLabel>Semester time elapsed</ProgressLabel>
            <ProgressValue />
          </Progress>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              {formatSemesterDate(semester.startDate)} – {formatSemesterDate(semester.endDate)}
            </span>
            {journey.weekNumber !== null ? <span>Study week {journey.weekNumber}</span> : null}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Your stage follows the semester calendar, not your answers or performance.</p>
        </CardContent>
      </Card>
    </section>
  );
}

function RecentCheckIns({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section aria-labelledby="recent-check-ins-title">
      <Card>
        <CardHeader>
          <History aria-hidden="true" />
          <CardTitle><h2 id="recent-check-ins-title">Recent Check-ins</h2></CardTitle>
          <CardDescription>Revisit a week in your own words.</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.recentCheckIns.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><ClipboardCheck aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>No weekly Check-ins yet</EmptyTitle>
                <EmptyDescription>Your first completed week will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {dashboard.recentCheckIns.map((checkIn, index) => (
                <li key={checkIn.id} className="flex flex-col gap-3">
                  {index > 0 ? <Separator /> : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/student/check-ins/${checkIn.id}`} className="flex min-h-11 flex-col justify-center gap-0.5 rounded-md py-1 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="font-medium underline-offset-4 hover:underline">{checkIn.periodKey}<span className="sr-only">: open reflection</span></span>
                      <span className="text-xs text-muted-foreground">{formatSubmissionDate(checkIn.submittedAt)}</span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary"><Check aria-hidden="true" />Completed</Badge>
                      {checkIn.mentorConversationRequest !== "NO" ? <ConversationState state={checkIn.mentorConversationRequest} /> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <Link href="/student/check-ins" className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-auto")}>Open history<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
        </CardFooter>
      </Card>
    </section>
  );
}

export function StudentJourneyDashboard({ name, dashboard, reflection, activeQuests, sharedAgreements }: {
  name: string; dashboard: Dashboard; reflection: Reflection; activeQuests?: ReactNode; sharedAgreements?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6 break-words">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">Your week, in perspective</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {name.split(" ")[0]}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">A short pause to notice your experience, one week at a time.</p>
      </div>
      <WeeklyAction dashboard={dashboard} />
      {activeQuests}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <RecentReflections reflection={reflection} hasOnboarding={Boolean(dashboard.onboarding)} />
        <SemesterJourney reflection={reflection} />
      </div>
      {sharedAgreements}
      <RecentCheckIns dashboard={dashboard} />
      <section aria-labelledby="development-areas-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="development-areas-title" className="text-lg font-semibold">Development areas</h2>
          <p className="text-sm leading-6 text-muted-foreground">Patterns in your reported experience. These may change from week to week.</p>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {reflection.reflections.areas.map((area) => (
            <Card key={area.domain}>
              <CardHeader><CardTitle><h3>{area.label}</h3></CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Badge variant="outline">{reflectionLabels[area.category] ?? "Building a picture"}</Badge>
                <p className="text-sm leading-6 text-muted-foreground">{area.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        {reflection.startingPoint ? (
          <section aria-labelledby="starting-point-title">
            <Card>
              <CardHeader>
                <CardTitle><h2 id="starting-point-title">Your starting point</h2></CardTitle>
                <CardDescription>From your onboarding reflection on {formatSubmissionDate(reflection.startingPoint.submittedAt)}.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {reflection.startingPoint.statements.map((statement, index) => <li key={index} className="text-sm leading-6 text-muted-foreground">{statement}</li>)}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={`/student/check-ins/${reflection.startingPoint.id}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-auto")}>Revisit your starting point<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
              </CardFooter>
            </Card>
          </section>
        ) : null}
        <section aria-labelledby="continuity-title">
          <Card>
            <CardHeader>
              <CardTitle><h2 id="continuity-title">Making time to reflect</h2></CardTitle>
              <CardDescription>{reflection.continuity.weeklyCount} weekly Check-ins completed this semester.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {reflection.continuity.streak > 1 ? <p className="text-sm text-muted-foreground">You have checked in for {reflection.continuity.streak} consecutive weeks.</p> : null}
              {reflection.continuity.milestones.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {reflection.continuity.milestones.map((milestone) => <li key={milestone} className="flex items-start gap-2 text-sm"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{milestone}</li>)}
                </ul>
              ) : <p className="text-sm leading-6 text-muted-foreground">Each Check-in adds a moment you can come back to. Begin when your first reflection is available.</p>}
            </CardContent>
          </Card>
        </section>
      </div>
      {reflection.mentorSignal ? (
        <section aria-labelledby="mentor-signal-title">
          <Card>
            <CardHeader>
              <MessageCircleMore aria-hidden="true" />
              <CardTitle><h2 id="mentor-signal-title">Your mentor conversation response</h2></CardTitle>
              <CardDescription>From your latest weekly Check-in · {reflection.mentorSignal.periodKey}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ConversationState state={reflection.mentorSignal.state} />
              <p className="text-sm leading-6 text-muted-foreground">
                {reflection.mentorSignal.state === "YES"
                  ? "You said a short conversation with your mentor would be helpful. Your response is saved with that Check-in."
                  : reflection.mentorSignal.state === "MAYBE"
                    ? "You said a short conversation might help. Your response is saved as a maybe."
                    : "You did not request a mentor conversation with that Check-in."}
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
