import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { requireMentor } from "@/modules/auth/application/authorization";

export const metadata: Metadata = {
  title: "Mentor",
};

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireMentor();

  return (
    <ApplicationShell user={user}>{children}</ApplicationShell>
  );
}
