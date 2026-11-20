"use client";

import { useActionState, useState } from "react";
import { FlaskConical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { domainLabels } from "@/modules/journey/domain/reflections";
import type { DevelopmentDomain } from "@/generated/prisma/enums";
import type { getQuestAssignmentForm } from "../application/queries";
import { assignQuestAction } from "../application/actions";
import { activeQuestLimitMessage, questDateAfterDays } from "../domain/presentation";

function ChoiceSelect({ id, label, value, items, onChange, disabled }: {
  id: string; label: string; value: string; items: { value: string; label: string }[]; onChange: (value: string) => void; disabled: boolean;
}) {
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Select items={items} value={value} onValueChange={(value) => { if (value) onChange(value); }} disabled={disabled}>
    <SelectTrigger id={id} className="min-h-11 w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{items.map((item) => <SelectItem key={item.value} value={item.value} className="whitespace-normal break-words">{item.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select></Field>;
}

export function QuestAssignmentForm({ data, submissionKey, today, prelinkedConversationId }: {
  data: Awaited<ReturnType<typeof getQuestAssignmentForm>>; submissionKey: string; today: string; prelinkedConversationId?: string;
}) {
  const [state, action, pending] = useActionState(assignQuestAction, {});
  const [templateId, setTemplateId] = useState("CUSTOM");
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<DevelopmentDomain>("WORK_START");
  const [dueDate, setDueDate] = useState(questDateAfterDays(today, 7));
  const [conversationId, setConversationId] = useState(prelinkedConversationId ?? "NONE");
  const [includeAgreement, setIncludeAgreement] = useState(Boolean(prelinkedConversationId));
  const conversation = data.conversations.find(({ id }) => id === conversationId);
  if (data.activeCount >= 2) return <Alert><AlertDescription>{activeQuestLimitMessage}</AlertDescription></Alert>;
  return <form action={action} className="flex min-w-0 flex-col gap-5">
    <input type="hidden" name="studentId" value={data.studentId} /><input type="hidden" name="submissionKey" value={submissionKey} />
    <input type="hidden" name="questTemplateId" value={templateId === "CUSTOM" ? "" : templateId} />
    <input type="hidden" name="domain" value={domain} /><input type="hidden" name="mentoringConversationId" value={conversationId === "NONE" ? "" : conversationId} />
    <input type="hidden" name="sharedAgreementId" value={includeAgreement ? conversation?.sharedAgreement?.id ?? "" : ""} />
    <FieldGroup>
      <ChoiceSelect id="quest-template" label="Starting point" value={templateId} disabled={pending}
        items={[{ value: "CUSTOM", label: "Custom Quest" }, ...data.templates.map((template) => ({ value: template.id, label: template.title }))]}
        onChange={(id) => { setTemplateId(id); const template = data.templates.find((item) => item.id === id); if (template) { setTitle(template.title); setDescription(template.description); setDomain(template.domain); setDueDate(questDateAfterDays(today, template.defaultDurationDays)); } }} />
      <Field><FieldLabel htmlFor="quest-title">Quest title</FieldLabel><Input id="quest-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={100} disabled={pending} className="min-h-11" /></Field>
      <Field><FieldLabel htmlFor="quest-description">Small behavioural experiment</FieldLabel><Textarea id="quest-description" name="description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} maxLength={1000} disabled={pending} aria-describedby="quest-description-help" />
        <FieldDescription id="quest-description-help">Describe one practical strategy to try, up to 1,000 characters. This is an experiment, not homework. Title and description will be visible to the Student.</FieldDescription></Field>
      <Field><FieldLabel id="quest-domain-label">Development area</FieldLabel>
        {templateId === "CUSTOM" ? <ToggleGroup value={[domain]} onValueChange={(values) => { if (values[0]) setDomain(values[0] as DevelopmentDomain); }} variant="outline" aria-labelledby="quest-domain-label" disabled={pending} className="grid w-full grid-cols-2">
          {Object.entries(domainLabels).map(([value, label]) => <ToggleGroupItem key={value} value={value} className="min-h-11 whitespace-normal p-2">{label}</ToggleGroupItem>)}
        </ToggleGroup> : <p className="text-sm">{domainLabels[domain]}</p>}
      </Field>
      <Field><FieldLabel htmlFor="quest-due">Try it by</FieldLabel><Input id="quest-due" name="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} min={today} max={questDateAfterDays(today, 365)} required disabled={pending} className="min-h-11 min-w-0" />
        <FieldDescription>Choose a manageable period. This date is a reminder to reflect, not a grading deadline.</FieldDescription></Field>
      <ChoiceSelect id="quest-conversation" label="Linked conversation (optional)" value={conversationId} disabled={pending}
        items={[{ value: "NONE", label: "No linked conversation" }, ...data.conversations.map((entry) => ({ value: entry.id, label: `${entry.occurredAt.toLocaleDateString("en-GB", { timeZone: "Europe/Luxembourg" })} · ${entry.topic}` }))]}
        onChange={(id) => { setConversationId(id); setIncludeAgreement(false); }} />
      {conversation?.sharedAgreement ? <Field><FieldLabel id="quest-agreement-label">Link the shared agreement?</FieldLabel>
        <ToggleGroup value={[includeAgreement ? "YES" : "NO"]} onValueChange={(values) => { if (values[0]) setIncludeAgreement(values[0] === "YES"); }} variant="outline" disabled={pending} aria-labelledby="quest-agreement-label" className="grid w-full grid-cols-2">
          <ToggleGroupItem value="YES" className="min-h-11 whitespace-normal">Include agreement</ToggleGroupItem><ToggleGroupItem value="NO" className="min-h-11">Quest only</ToggleGroupItem>
        </ToggleGroup><FieldDescription className="whitespace-pre-wrap">{conversation.sharedAgreement.text}</FieldDescription></Field> : null}
    </FieldGroup>
    <p className="text-sm text-muted-foreground">{data.activeCount} of 2 active Quests. Review before assigning: this wording will be preserved.</p>
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <Button type="submit" disabled={pending} className="min-h-11 self-start">{pending ? <Spinner data-icon="inline-start" /> : <FlaskConical data-icon="inline-start" />}Assign Quest</Button>
  </form>;
}
