"use client";

import { useActionState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cancelQuestAction } from "../application/actions";

export function CancelQuestForm({ studentId, questId }: { studentId: string; questId: string }) {
  const [state, action, pending] = useActionState(cancelQuestAction, {});
  return <form action={action} className="flex flex-col gap-2">
    <input type="hidden" name="studentId" value={studentId} /><input type="hidden" name="questId" value={questId} />
    <Button type="submit" variant="outline" disabled={pending} className="min-h-11 self-start">{pending ? <Spinner data-icon="inline-start" /> : <X data-icon="inline-start" />}Cancel Quest</Button>
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}<p role="status" className="text-sm text-muted-foreground">{state.message}</p>
  </form>;
}
