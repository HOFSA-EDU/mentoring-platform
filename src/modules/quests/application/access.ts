import type { Prisma } from "@/generated/prisma/client";
import { AuthorizationError } from "@/modules/auth/domain/authorization-policy";

export const ownedQuestStudentScope = (actorUserId: string) => ({ active: true, user: { id: actorUserId, active: true, role: "STUDENT" as const } });

export async function lockStudentQuests(tx: Prisma.TransactionClient, studentId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`quests:${studentId}`}, 0))`;
}

export async function lockQuestOwner(tx: Prisma.TransactionClient, actorUserId: string, studentId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT s."id" FROM "StudentProfile" s JOIN "User" u ON u."id" = s."userId"
    WHERE s."id" = ${studentId} AND u."id" = ${actorUserId}
      AND s."active" AND u."active" AND u."role" = 'STUDENT'
    FOR SHARE OF s, u`;
  if (!rows.length) throw new AuthorizationError();
}
