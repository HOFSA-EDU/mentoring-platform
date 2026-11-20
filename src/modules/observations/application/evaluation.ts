import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";
import { assignedStudentScope } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import { recordAuditEvent } from "@/modules/audit/application/record-event";
import { reflectionCheckInSelect } from "@/modules/journey/application/snapshot-selection";
import { evaluateObservationRules } from "@/modules/observations/domain/engine";

type EvaluationActor = { userId: string; role: "STUDENT" | "MENTOR" };

export async function lockStudentObservations(transaction: Prisma.TransactionClient, studentId: string) {
  // Also used by lifecycle writes. Reads after this lock use READ COMMITTED,
  // so concurrent recovery/submission requests see the previous writer's commit.
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`observations:${studentId}`}, 0))`;
}

/** Internal authorized processor. Not a Server Action and returns no Observation data. */
export async function evaluateStudentObservations(actor: EvaluationActor, studentId: string, now = new Date()): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await lockStudentObservations(transaction, studentId);
    const scope = actor.role === "MENTOR" ? assignedStudentScope(actor.userId)
      : { active: true, user: { id: actor.userId, active: true, role: "STUDENT" as const } };
    const student = await transaction.studentProfile.findFirst({ where: { ...scope, id: studentId }, select: { id: true, userId: true } });
    if (!student) throw new AuthorizationError();
    const history = await transaction.checkIn.findMany({
      where: { studentId, student: scope, kind: "WEEKLY", submittedAt: { lte: now } },
      select: { ...reflectionCheckInSelect, answers: { ...reflectionCheckInSelect.answers,
        select: { ...reflectionCheckInSelect.answers.select, id: true } } },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    });
    const stored = await transaction.observation.findMany({
      where: { studentId, student: scope },
      orderBy: [{ resolvedAt: "desc" }, { id: "asc" }],
    });
    // Replay missed submissions in order. A resolved episode supplies a strict
    // evidence cutoff; only fresh post-resolution answers can create a new one.
    for (const checkIn of history) {
      const prior = history.filter((entry) => entry.semesterId === checkIn.semesterId && entry.submittedAt <= checkIn.submittedAt);
      const resolved = stored.filter((entry) => entry.semesterId === checkIn.semesterId && entry.status === "RESOLVED");
      const cutoffs = new Map<string, typeof resolved[number]>();
      for (const entry of resolved) if (!cutoffs.has(entry.ruleKey)) cutoffs.set(entry.ruleKey, entry);
      const initial = evaluateObservationRules(prior, checkIn.semesterId, checkIn.submittedAt)
        .filter((candidate) => !cutoffs.has(candidate.ruleKey));
      const recurring = [...cutoffs.values()].flatMap((previous) => evaluateObservationRules(
        prior.filter((entry) => entry.submittedAt > previous.resolvedAt!), checkIn.semesterId, checkIn.submittedAt,
      ).filter((candidate) => candidate.ruleKey === previous.ruleKey));
      for (const candidate of [...initial, ...recurring]) {
        const episodeKey = cutoffs.get(candidate.ruleKey)?.id ?? "initial";
        let observation = stored.find((entry) => entry.semesterId === checkIn.semesterId && entry.ruleKey === candidate.ruleKey && entry.episodeKey === episodeKey);
        if (!observation) {
          observation = await transaction.observation.create({ data: {
            studentId, semesterId: checkIn.semesterId, ruleKey: candidate.ruleKey, episodeKey,
            type: candidate.type, domain: candidate.domain, title: candidate.title, summary: candidate.summary,
            firstDetectedAt: candidate.detectedAt, lastDetectedAt: candidate.detectedAt,
          } });
          stored.push(observation);
          await recordAuditEvent(transaction, {
            actorUserId: student.userId, action: "OBSERVATION_CREATED", entityType: "OBSERVATION", entityId: observation.id,
            metadata: { origin: "CHECK_IN_ENGINE", ruleVersion: "v1" },
          });
        }
        if (observation.status === "RESOLVED") continue;
        if (candidate.detectedAt > observation.lastDetectedAt) {
          await transaction.observation.updateMany({
            where: { id: observation.id, student: scope, status: { not: "RESOLVED" } },
            data: { lastDetectedAt: candidate.detectedAt },
          });
          observation.lastDetectedAt = candidate.detectedAt;
        }
        // Existing evidence is never updated or replaced, including on retries.
        await transaction.observationEvidence.createMany({
          data: candidate.evidence.map((evidence) => ({ ...evidence, observationId: observation.id })), skipDuplicates: true,
        });
      }
    }
  }, { isolationLevel: "ReadCommitted", timeout: 20_000 });
}

export async function tryEvaluateStudentObservations(actor: EvaluationActor, studentId: string, now = new Date()) {
  try { await evaluateStudentObservations(actor, studentId, now); return true; }
  catch {
    // Do not log source responses, account data or raw database errors.
    console.error("Observation evaluation deferred; stored Check-ins remain available.");
    return false;
  }
}

export async function evaluateAfterWeeklySubmission(actorUserId: string, checkInId: string, now: Date) {
  try {
    const entry = await prisma.checkIn.findFirst({
      where: { id: checkInId, kind: "WEEKLY", student: { active: true, user: { id: actorUserId, active: true, role: "STUDENT" } } },
      select: { studentId: true },
    });
    if (entry) await tryEvaluateStudentObservations({ userId: actorUserId, role: "STUDENT" }, entry.studentId, now);
  } catch { console.error("Observation evaluation deferred; stored Check-ins remain available."); }
}
