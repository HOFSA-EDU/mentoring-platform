import { reflectionCheckInSelect } from "./snapshot-selection";
import { prisma } from "@/lib/prisma";
import { requireActiveStudentProfile } from "@/modules/check-ins/application/student-context";
import { buildBaselineFeedback } from "@/modules/check-ins/domain/feedback";
import { buildStudentReflections } from "@/modules/journey/domain/reflections";
import { calculateJourney } from "@/modules/journey/domain/journey";
import { calculateContinuity } from "@/modules/journey/domain/continuity";

// Internal read service: actorUserId always comes from requireStudent at the
// route boundary. There is deliberately no target student/profile parameter.
// Revalidate active account/profile and scope every read to the resolved owner.
export async function getStudentJourney(actorUserId: string, now = new Date()) {
  const profile = await requireActiveStudentProfile(prisma, actorUserId, {
    requireActiveSemester: false,
  });
  const checkIns = await prisma.checkIn.findMany({
    where: {
      studentId: profile.id,
      submittedAt: { lte: now },
      OR: [{ semesterId: profile.semesterId }, { kind: "ONBOARDING" }],
    },
    select: reflectionCheckInSelect,
    orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
  });
  const baseline = checkIns.find((checkIn) => checkIn.kind === "ONBOARDING");
  const latestWeekly = checkIns.find((checkIn) => checkIn.kind === "WEEKLY");

  // Only safe, descriptive presentation data leaves this service: no internal
  // direction values, signature hashes, full raw answers or account identifiers.
  return {
    semester: profile.semester,
    journey: calculateJourney(now, profile.semester.startDate, profile.semester.endDate),
    reflections: buildStudentReflections(checkIns, profile.semesterId, now),
    continuity: calculateContinuity(checkIns, profile.semesterId, now),
    startingPoint: baseline ? {
      id: baseline.id,
      submittedAt: baseline.submittedAt,
      statements: buildBaselineFeedback(baseline.answers),
    } : null,
    mentorSignal: latestWeekly ? {
      state: latestWeekly.mentorConversationRequest,
      periodKey: latestWeekly.periodKey,
    } : null,
  };
}
