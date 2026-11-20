"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { updateFollowUpAction } from "../application/actions";

export function FollowUpActions({ studentId, followUpId }: { studentId: string; followUpId: string }) {
  const [state, action, pending] = useActionState(updateFollowUpAction, {});
  return <form action={action} className="flex flex-col gap-2">
    <input type="hidden" name="studentId" value={studentId} /><input type="hidden" name="followUpId" value={followUpId} />
    <FieldGroup><Field orientation="horizontal" className="flex-wrap">
      <Button type="submit" name="status" value="COMPLETED" variant="outline" disabled={pending} className="min-h-11">{pending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}Complete follow-up</Button>
      <Button type="submit" name="status" value="CANCELLED" variant="ghost" disabled={pending} className="min-h-11"><X data-icon="inline-start" />Cancel follow-up</Button>
    </Field></FieldGroup>
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <p role="status" className="text-sm text-muted-foreground">{state.message}</p>
  </form>;
}
