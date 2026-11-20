import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { requireStudent } from "@/modules/auth/application/authorization";

export const metadata: Metadata = {
  title: "Student",
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStudent();

  return (
    <ApplicationShell user={user}>{children}</ApplicationShell>
  );
}
