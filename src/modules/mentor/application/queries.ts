import { prisma } from "@/lib/prisma";
import { AuthorizationError, assertMentorCanAccessStudent } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope, prismaStudentAccessPolicyRepository } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { reflectionCheckInSelect } from "@/modules/journey/application/snapshot-selection";
import { buildStudentReflections } from "@/modules/journey/domain/reflections";
import { calculateJourney } from "@/modules/journey/domain/journey";
import { mentorReflection, orderMentorStudents, summarizeMentorStudent } from "@/modules/mentor/domain/presentation";
import { tryEvaluateStudentObservations } from "@/modules/observations/application/evaluation";
import { observationSummarySelect } from "@/modules/observations/application/queries";

async function requireMentorActor(actorUserId: string) {
  const mentor = await prisma.mentorProfile.findFirst({
    where: { active: true, user: { id: actorUserId, active: true, role: "MENTOR" } },
    select: { id: true },
  });
  if (!mentor) throw new AuthorizationError();
}

const studentSelect = {
  id: true, user: { select: { name: true } },
  semester: { select: { id: true, name: true, startDate: true, endDate: true, active: true } },
} as const;

function mentoringAttentionSelect(actorUserId: string) {
  return {
    followUps: { where: { status: "OPEN" as const, student: assignedStudentScope(actorUserId) }, select: { id: true, dueAt: true } },
    conversations: { where: { student: assignedStudentScope(actorUserId), observations: { some: { observation: { type: "CONVERSATION_REQUEST" as const, status: "RESOLVED" as const } } } },
      select: { occurredAt: true, observations: { where: { observation: { type: "CONVERSATION_REQUEST" as const, status: "RESOLVED" as const } }, select: { observation: { select: { lastDetectedAt: true } } } } } },
  };
}

export async function listMentorStudents(actorUserId: string, now = new Date()) {
  await requireMentorActor(actorUserId);
  const assigned = await prisma.studentProfile.findMany({ where: assignedStudentScope(actorUserId), select: { id: true } });
  const failed = new Set<string>();
  for (const student of assigned) {
    if (!await tryEvaluateStudentObservations({ userId: actorUserId, role: "MENTOR" }, student.id, now)) failed.add(student.id);
  }
  const students = await prisma.studentProfile.findMany({
    where: assignedStudentScope(actorUserId),
    select: { ...studentSelect, ...mentoringAttentionSelect(actorUserId), observations: {
      where: { student: assignedStudentScope(actorUserId), status: { not: "RESOLVED" } }, select: observationSummarySelect,
    }, checkIns: {
      where: { submittedAt: { lte: now }, student: assignedStudentScope(actorUserId) },
      select: reflectionCheckInSelect, orderBy: { submittedAt: "desc" },
    } },
  });
  return orderMentorStudents(students.map((student) => ({ ...summarizeMentorStudent(student, now), observationRefreshFailed: failed.has(student.id) })));
}

export async function getMentorStudentDetail(actorUserId: string, studentId: string, now = new Date()) {
  await assertMentorCanAccessStudent(actorUserId, studentId, prismaStudentAccessPolicyRepository);
  const observationRefreshFailed = !await tryEvaluateStudentObservations({ userId: actorUserId, role: "MENTOR" }, studentId, now);
  // Include assignment predicates in the data read as well as the policy check.
  const student = await prisma.studentProfile.findFirst({
    where: { ...assignedStudentScope(actorUserId), id: studentId },
    select: { ...studentSelect, ...mentoringAttentionSelect(actorUserId), observations: {
      where: { student: assignedStudentScope(actorUserId) }, select: observationSummarySelect,
      orderBy: [{ lastDetectedAt: "desc" }, { id: "asc" }],
    }, checkIns: {
      where: { submittedAt: { lte: now }, student: assignedStudentScope(actorUserId) },
      select: reflectionCheckInSelect, orderBy: { submittedAt: "desc" },
    } },
  });
  if (!student) throw new AuthorizationError();
  const reflections = buildStudentReflections(student.checkIns, student.semester.id, now);
  const areas = reflections.areas.map((area) => ({ ...area, text: mentorReflection(area) }));
  const baseline = student.checkIns.find((entry) => entry.kind === "ONBOARDING");
  return {
    ...summarizeMentorStudent(student, now), semester: student.semester,
    observations: student.observations, observationRefreshFailed,
    journey: calculateJourney(now, student.semester.startDate, student.semester.endDate),
    areas,
    changes: [...areas.filter((area) => area.category === "MORE_DIFFICULT"),
      ...areas.filter((area) => area.category === "IMPROVING")].slice(0, 2),
    history: student.checkIns.filter((entry) => entry.kind === "WEEKLY").map((entry) => ({
      id: entry.id, periodKey: entry.periodKey, submittedAt: entry.submittedAt,
      conversation: entry.mentorConversationRequest, answerCount: entry.answers.length,
    })),
    baseline: baseline ? { id: baseline.id, submittedAt: baseline.submittedAt,
      answers: baseline.answers.slice(0, 2).map((answer) => ({
        question: answer.questionTextSnapshot, answer: answer.optionLabelSnapshot,
      })) } : null,
  };
}

export async function getMentorCheckIn(actorUserId: string, studentId: string, checkInId: string) {
  await assertMentorCanAccessStudent(actorUserId, studentId, prismaStudentAccessPolicyRepository);
  const checkIn = await prisma.checkIn.findFirst({
    where: { id: checkInId, studentId, student: assignedStudentScope(actorUserId) },
    select: {
      id: true, kind: true, periodKey: true, submittedAt: true, mentorConversationRequest: true,
      student: { select: { id: true, user: { select: { name: true } } } },
      semester: { select: { name: true } },
      answers: { select: { questionTextSnapshot: true, optionLabelSnapshot: true, domainSnapshot: true, sortOrder: true },
        orderBy: { sortOrder: "asc" } },
    },
  });
  if (!checkIn) throw new AuthorizationError();
  return checkIn;
}
