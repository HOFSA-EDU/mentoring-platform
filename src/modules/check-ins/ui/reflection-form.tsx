"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ReflectionActionState } from "@/modules/check-ins/application/actions";

type ReflectionQuestion = {
  id: string;
  text: string;
  options: Array<{ id: string; label: string }>;
};

type ReflectionFormAction = (
  state: ReflectionActionState,
  formData: FormData,
) => Promise<ReflectionActionState>;

export function ReflectionForm({
  action,
  questions,
  submitLabel,
  includeConversationRequest,
}: {
  action: ReflectionFormAction;
  questions: ReflectionQuestion[];
  submitLabel: string;
  includeConversationRequest: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [conversationRequest, setConversationRequest] = useState("");
  const totalItems = questions.length + (includeConversationRequest ? 1 : 0);
  const answeredItems = useMemo(
    () =>
      Object.values(answers).filter(Boolean).length +
      (includeConversationRequest && conversationRequest ? 1 : 0),
    [answers, conversationRequest, includeConversationRequest],
  );
  const showErrors = Boolean(state.error);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <Progress value={(answeredItems / totalItems) * 100}>
          <ProgressLabel>Your progress</ProgressLabel>
          <ProgressValue>
            {() => `${answeredItems} of ${totalItems} answered`}
          </ProgressValue>
        </Progress>

        {state.error ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {questions.map((question, index) => {
          const selected = answers[question.id] ?? "";
          const invalid = showErrors && !selected;
          const labelId = `question-${question.id}`;

          return (
            <Card key={question.id}>
              <CardHeader>
                <CardDescription>
                  Question {index + 1} of {questions.length}
                </CardDescription>
                <CardTitle>{question.text}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldSet data-invalid={invalid}>
                  <FieldLegend id={labelId} className="sr-only">
                    {question.text}
                  </FieldLegend>
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="optionId" value={selected} />
                  <ToggleGroup
                    value={selected ? [selected] : []}
                    onValueChange={(values) => {
                      const nextValue = values[0];

                      if (nextValue) {
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: nextValue,
                        }));
                      }
                    }}
                    orientation="vertical"
                    variant="outline"
                    aria-labelledby={labelId}
                    disabled={pending}
                    className="w-full items-stretch"
                  >
                    {question.options.map((option) => (
                      <ToggleGroupItem
                        key={option.id}
                        value={option.id}
                        aria-invalid={invalid}
                        className="h-auto min-h-12 w-full justify-start whitespace-normal px-3 py-3 text-left"
                      >
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  {invalid ? <FieldError>Choose one answer.</FieldError> : null}
                </FieldSet>
              </CardContent>
            </Card>
          );
        })}

        {includeConversationRequest ? (
          <Card>
            <CardHeader>
              <CardDescription>Mentor support</CardDescription>
              <CardTitle>
                Would a short conversation with your mentor be helpful for something right now?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet data-invalid={showErrors && !conversationRequest}>
                <FieldLegend id="conversation-request-label" className="sr-only">
                  Mentor conversation request
                </FieldLegend>
                <input
                  type="hidden"
                  name="mentorConversationRequest"
                  value={conversationRequest}
                />
                <ToggleGroup
                  value={conversationRequest ? [conversationRequest] : []}
                  onValueChange={(values) => {
                    if (values[0]) {
                      setConversationRequest(values[0]);
                    }
                  }}
                  variant="outline"
                  aria-labelledby="conversation-request-label"
                  disabled={pending}
                  className="w-full"
                >
                  <ToggleGroupItem value="YES" className="min-h-12 flex-1">
                    Yes
                  </ToggleGroupItem>
                  <ToggleGroupItem value="MAYBE" className="min-h-12 flex-1">
                    Maybe
                  </ToggleGroupItem>
                  <ToggleGroupItem value="NO" className="min-h-12 flex-1">
                    No
                  </ToggleGroupItem>
                </ToggleGroup>
                {showErrors && !conversationRequest ? (
                  <FieldError>Choose Yes, Maybe, or No.</FieldError>
                ) : null}
              </FieldSet>
            </CardContent>
          </Card>
        ) : (
          <input type="hidden" name="mentorConversationRequest" value="NO" />
        )}

        <Button type="submit" size="lg" disabled={pending} className="sm:self-end">
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          {pending ? "Submitting…" : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
