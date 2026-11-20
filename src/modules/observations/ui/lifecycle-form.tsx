"use client";

import { useActionState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { updateObservationAction } from "@/modules/observations/application/actions";
import type { ObservationStatus } from "@/generated/prisma/client";

export function ObservationLifecycleForm({ studentId, observationId, status }: {
  studentId: string; observationId: string; status: ObservationStatus;
}) {
  const [state, action, pending] = useActionState(updateObservationAction, {});
  return <form action={action} className="flex flex-col gap-3">
    <input type="hidden" name="studentId" value={studentId} />
    <input type="hidden" name="observationId" value={observationId} />
    {status !== "RESOLVED" ? <FieldGroup><Field orientation="horizontal" className="flex-wrap">
      {status === "OPEN" ? <Button type="submit" name="status" value="ACKNOWLEDGED" variant="outline" disabled={pending} className="min-h-11">
        {pending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}Acknowledge</Button> : null}
      <Button type="submit" name="status" value="RESOLVED" variant="outline" disabled={pending} className="min-h-11">
        {pending ? <Spinner data-icon="inline-start" /> : <CheckCheck data-icon="inline-start" />}Resolve</Button>
    </Field></FieldGroup> : null}
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <p role="status" className="text-sm text-muted-foreground">{state.message}</p>
  </form>;
}
