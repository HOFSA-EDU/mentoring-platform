import type { Prisma } from "@/generated/prisma/client";

import { CheckInOperationError } from "@/modules/check-ins/domain/errors";

export async function requireActiveStudentProfile(
  transaction: Pick<Prisma.TransactionClient, "studentProfile">,
  actorUserId: string,
  options: { requireActiveSemester: boolean },
) {
  const profile = await transaction.studentProfile.findFirst({
    where: {
      active: true,
      user: { id: actorUserId, active: true, role: "STUDENT" },
    },
    select: {
      id: true,
      semesterId: true,
      semester: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          active: true,
        },
      },
    },
  });

  if (!profile) {
    throw new CheckInOperationError("An active Student account is required.");
  }

  if (options.requireActiveSemester && !profile.semester.active) {
    throw new CheckInOperationError(
      "Your semester is not currently active. Check-ins are unavailable.",
    );
  }

  return profile;
}
