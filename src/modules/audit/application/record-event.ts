import {
  type AuditAction,
  type AuditEntityType,
  Prisma,
} from "@/generated/prisma/client";

export function recordAuditEvent(
  transaction: Prisma.TransactionClient,
  input: {
    actorUserId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return transaction.auditEvent.create({
    data: input,
    select: { id: true },
  });
}
