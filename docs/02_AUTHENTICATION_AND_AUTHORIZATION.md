# Authentication and Authorization

## Authentication boundary

Auth.js handles encrypted JWT sessions and the `/api/auth/*` protocol routes.
The only enabled provider is email/password credentials. Account creation is an
administrative concern; there is no registration, social login, or passwordless
flow in Phase 01.

Credentials are validated with Zod. Email addresses are normalized to lowercase,
and passwords are compared with bcrypt cost 12. Login failures use the same
message for unknown accounts, inactive accounts, and incorrect passwords. The
session exposes only user ID, name, email, and role—never the password hash or
active flag.

`AUTH_SECRET` is required and must contain at least 32 characters. Generate a
unique deployment secret with `npx auth secret`; do not reuse the development
value from a local ignored `.env` file.

## Authorization boundary

`src/modules/auth/application/authorization.ts` is the central server-side
entry point. Every protected page and role layout uses `requireStudent`,
`requireMentor`, or `requireAdmin`. Each request resolves the session user ID and
re-reads the account from PostgreSQL, so role changes and deactivation take
effect without waiting for JWT expiry.

Roles are exact, not hierarchical. An Admin does not inherit Mentor or Student
access; a Mentor does not inherit Student access. Unauthorized users are sent to
their own role home, while unauthenticated users are sent to `/login`.

Future student-specific data access must call the ownership or active-assignment
policies before reading records:

- students may access only the profile linked to their own active account;
- mentors may access only active students with an active mentor assignment;
- administrative access does not imply access to future private mentor notes.

UI hiding is never treated as authorization.

## Session and operational hardening

Sessions expire after eight hours. No credential, password hash, or private data
is written to application logs. Phase 01 deliberately does not add Redis or a
distributed rate-limit service. Before internet-facing production deployment,
apply rate limiting to credential POST requests at the trusted reverse proxy or
edge layer (keyed by both source and normalized account identifier), with
monitoring and conservative lockout behaviour that does not reveal account
existence. An application-level limiter can be added later behind an interface
without changing the credential verification service.
