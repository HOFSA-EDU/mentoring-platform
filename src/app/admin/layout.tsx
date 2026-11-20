import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";
import { requireAdmin } from "@/modules/auth/application/authorization";

export const metadata: Metadata = {
  title: "Administration",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <ApplicationShell user={user}>{children}</ApplicationShell>
  );
}
