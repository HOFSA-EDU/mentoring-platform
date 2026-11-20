export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor() {
    super("You do not have access to this resource.");
    this.name = "AuthorizationError";
  }
}

export type StudentAccessPolicyRepository = {
  hasActiveMentorAssignment(
    mentorUserId: string,
    studentProfileId: string,
  ): Promise<boolean>;
  studentOwnsProfile(
    studentUserId: string,
    studentProfileId: string,
  ): Promise<boolean>;
};

export async function assertMentorCanAccessStudent(
  mentorUserId: string,
  studentProfileId: string,
  repository: StudentAccessPolicyRepository,
): Promise<void> {
  if (
    !(await repository.hasActiveMentorAssignment(
      mentorUserId,
      studentProfileId,
    ))
  ) {
    throw new AuthorizationError();
  }
}

export async function assertStudentOwnsProfile(
  studentUserId: string,
  studentProfileId: string,
  repository: StudentAccessPolicyRepository,
): Promise<void> {
  if (!(await repository.studentOwnsProfile(studentUserId, studentProfileId))) {
    throw new AuthorizationError();
  }
}
