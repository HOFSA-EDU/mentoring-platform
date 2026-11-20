import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string; icon: LucideIcon };
}) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-3xl flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action && ActionIcon ? (
        <Button render={<Link href={action.href} />} nativeButton={false}>
          <ActionIcon data-icon="inline-start" />
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
