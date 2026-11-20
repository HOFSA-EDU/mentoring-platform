import {
  Prisma,
  UserRole,
} from "@/generated/prisma/client";
import { AdminOperationError } from "@/modules/admin/domain/errors";

export { recordAuditEvent } from "@/modules/audit/application/record-event";

export async function assertAdminActor(
  transaction: Prisma.TransactionClient,
  actorUserId: string,
): Promise<void> {
  const actor = await transaction.user.findFirst({
    where: { id: actorUserId, role: UserRole.ADMIN, active: true },
    select: { id: true },
  });

  if (!actor) {
    throw new AdminOperationError("Administrator access is required.");
  }
}
