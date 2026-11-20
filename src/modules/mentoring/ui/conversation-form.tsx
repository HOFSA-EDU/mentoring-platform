"use client";

import { useActionState, useState } from "react";
import { Check, Handshake, LockKeyhole, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { recordConversationAction } from "../application/actions";
import type { getConversationFormData } from "../application/queries";
import { observationStatusLabels } from "@/modules/observations/ui/observation-list";

export function ConversationForm({ data, submissionKey, defaultOccurredAt, prelinkedId }: {
  data: Awaited<ReturnType<typeof getConversationFormData>>; submissionKey: string; defaultOccurredAt: string; prelinkedId?: string;
}) {
  const [state, action, pending] = useActionState(recordConversationAction, {});
  const [selected, setSelected] = useState<string[]>(prelinkedId ? [prelinkedId] : []);
  const [values, setValues] = useState({ occurredAt: defaultOccurredAt, topic: "", privateNote: "", sharedAgreement: "", followUpDate: "", followUpNote: "" });
  const valueProps = (key: keyof typeof values) => ({ value: values[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((current) => ({ ...current, [key]: event.target.value })) });
  return <form action={action} className="flex min-w-0 flex-col gap-5">
    <input type="hidden" name="studentId" value={data.studentId} />
    <input type="hidden" name="submissionKey" value={submissionKey} />
    {selected.map((id) => <input key={id} type="hidden" name="observationIds" value={id} />)}
    <FieldGroup>
      <Field><FieldLabel htmlFor="occurredAt">Conversation date and time</FieldLabel>
        <Input id="occurredAt" name="occurredAt" type="datetime-local" required {...valueProps("occurredAt")} aria-describedby="conversation-time-help" className="min-h-11 min-w-0" />
        <FieldDescription id="conversation-time-help">Luxembourg time. Record a completed conversation from the last 180 days.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="topic">Topic</FieldLabel><Input id="topic" name="topic" required maxLength={160} {...valueProps("topic")} placeholder="Getting started with larger assignments" className="min-h-11" /></Field>
      <Field><FieldLabel id="linked-observations-label">Linked Observations (optional)</FieldLabel>
        {data.observations.length ? <ToggleGroup multiple value={selected} onValueChange={setSelected} orientation="vertical" variant="outline" aria-labelledby="linked-observations-label" className="w-full">
          {data.observations.map((observation) => <ToggleGroupItem key={observation.id} value={observation.id} className="min-h-11 w-full justify-start whitespace-normal p-3 text-left">
            {selected.includes(observation.id) ? <Check aria-hidden="true" className="shrink-0" /> : null}
            <span>{observation.title} <span className="text-muted-foreground">· {observationStatusLabels[observation.status]}</span></span>
          </ToggleGroupItem>)}
        </ToggleGroup> : <p className="text-sm text-muted-foreground">No Observations to link. You can still record the conversation.</p>}
        <FieldDescription>A linked conversation request is resolved only if this conversation occurred after its latest request. Other Observations keep their status.</FieldDescription>
      </Field>
    </FieldGroup>
    <Card size="sm"><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole aria-hidden="true" className="size-4" />Mentor only</CardTitle>
      <CardDescription>Keep notes relevant to study support and avoid unnecessary sensitive personal information.</CardDescription></CardHeader>
      <CardContent><FieldGroup><Field><FieldLabel htmlFor="privateNote">Private mentor note</FieldLabel>
        <Textarea id="privateNote" name="privateNote" maxLength={4000} rows={3} {...valueProps("privateNote")} aria-describedby="private-note-help" />
        <FieldDescription id="private-note-help">Only mentors with authorized access can see this note. Optional, up to 4,000 characters.</FieldDescription>
      </Field></FieldGroup></CardContent></Card>
    <Card size="sm"><CardHeader><CardTitle className="flex items-center gap-2"><Handshake aria-hidden="true" className="size-4" />Shared with the Student</CardTitle>
      <CardDescription>Agree on a small, concrete next step together.</CardDescription></CardHeader>
      <CardContent><FieldGroup><Field><FieldLabel htmlFor="sharedAgreement">Shared agreement</FieldLabel>
        <Textarea id="sharedAgreement" name="sharedAgreement" maxLength={2000} rows={3} {...valueProps("sharedAgreement")} aria-describedby="agreement-help" placeholder="Before Friday, choose one assignment and identify its first concrete step." />
        <FieldDescription id="agreement-help">The Student will see this text and the conversation date. Optional, up to 2,000 characters.</FieldDescription>
      </Field></FieldGroup></CardContent></Card>
    <Card size="sm"><CardHeader><CardTitle>Internal follow-up (optional)</CardTitle><CardDescription>A reminder for authorized mentors. Neither the date nor the note is shared with the Student.</CardDescription></CardHeader>
      <CardContent><FieldGroup>
        <Field><FieldLabel htmlFor="followUpDate">Follow-up date</FieldLabel><Input id="followUpDate" name="followUpDate" type="date" {...valueProps("followUpDate")} className="min-h-11 min-w-0" /></Field>
        <Field><FieldLabel htmlFor="followUpNote">Internal follow-up note</FieldLabel><Textarea id="followUpNote" name="followUpNote" maxLength={2000} rows={2} {...valueProps("followUpNote")} aria-describedby="follow-up-help" />
          <FieldDescription id="follow-up-help">Optional, up to 2,000 characters. Keep this focused on what to revisit.</FieldDescription></Field>
      </FieldGroup></CardContent></Card>
    <p className="text-sm text-muted-foreground">Review before saving. Recorded conversations and agreements are preserved and cannot be edited.</p>
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <Button type="submit" disabled={pending} className="min-h-11 self-start">{pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}Save conversation</Button>
  </form>;
}
