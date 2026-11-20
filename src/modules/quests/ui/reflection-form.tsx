"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { reflectOnQuestAction } from "../application/actions";
import { attemptLabels, helpfulnessLabels } from "../domain/presentation";

export function QuestReflectionForm({ questId, prompt }: { questId: string; prompt: string }) {
  const [state, action, pending] = useActionState(reflectOnQuestAction, {});
  const [attempted, setAttempted] = useState(""); const [helpful, setHelpful] = useState(""); const [text, setText] = useState("");
  return <form action={action} className="flex min-w-0 flex-col gap-5">
    <input type="hidden" name="questId" value={questId} /><input type="hidden" name="attempted" value={attempted} /><input type="hidden" name="helpful" value={helpful} />
    <p className="text-sm leading-6 text-muted-foreground">This is not a test. The goal is to find out what works for you. Yes, Partly and No are all useful answers.</p>
    <FieldGroup>
      <Field data-invalid={Boolean(state.error && !attempted)}><FieldLabel id="quest-attempt-label">Did you try it?</FieldLabel>
        <ToggleGroup value={attempted ? [attempted] : []} onValueChange={(values) => { if (values[0]) setAttempted(values[0]); }} variant="outline" disabled={pending} aria-labelledby="quest-attempt-label" className="grid w-full grid-cols-3">
          {Object.entries(attemptLabels).map(([value, label]) => <ToggleGroupItem key={value} value={value} aria-invalid={Boolean(state.error && !attempted)} className="min-h-12">{label}</ToggleGroupItem>)}
        </ToggleGroup>{state.error && !attempted ? <FieldError>Choose one answer.</FieldError> : null}</Field>
      <Field data-invalid={Boolean(state.error && !helpful)}><FieldLabel id="quest-helpful-label">Did it help?</FieldLabel>
        <ToggleGroup value={helpful ? [helpful] : []} onValueChange={(values) => { if (values[0]) setHelpful(values[0]); }} variant="outline" disabled={pending} aria-labelledby="quest-helpful-label" className="grid w-full grid-cols-2">
          {Object.entries(helpfulnessLabels).map(([value, label]) => <ToggleGroupItem key={value} value={value} aria-invalid={Boolean(state.error && !helpful)} className="min-h-12">{label}</ToggleGroupItem>)}
        </ToggleGroup>{state.error && !helpful ? <FieldError>Choose one answer.</FieldError> : null}</Field>
      <Field><FieldLabel htmlFor="quest-reflection-text">What did you notice? (optional)</FieldLabel><Textarea id="quest-reflection-text" name="reflectionText" rows={4} value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} disabled={pending} aria-describedby="quest-reflection-help" />
        <FieldDescription id="quest-reflection-help">{prompt !== "What did you notice?" ? `${prompt} ` : ""}Up to 2,000 characters. Your currently assigned Mentor can read your reflection.</FieldDescription></Field>
    </FieldGroup>
    <p className="text-sm text-muted-foreground">Saving your reflection completes this Quest, whatever your answers. Review before saving; your reflection is kept as submitted.</p>
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <Button type="submit" disabled={pending} className="min-h-12 w-full sm:w-auto sm:self-start">{pending ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}Save reflection</Button>
  </form>;
}
