"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionState } from "@/modules/admin/application/actions";
import {
  developmentDomains,
  questionContexts,
  questionTypes,
} from "@/modules/admin/domain/schemas";

import {
  domainLabels,
  questionContextLabels,
  questionTypeLabels,
} from "./domain-labels";
import { errorObjects, FormError, SelectField } from "./form-controls";

type QuestionFormAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

type EditableOption = {
  clientId: string;
  label: string;
  value: string;
  directionValue: number | null;
  sortOrder: number;
};

function blankOption(index: number): EditableOption {
  return {
    clientId: `new-${Date.now()}-${index}`,
    label: "",
    value: "",
    directionValue: index === 0 ? 0 : Math.min(index, 3),
    sortOrder: index + 1,
  };
}

export function QuestionForm({
  action,
  defaultValues,
  mode,
}: {
  action: QuestionFormAction;
  defaultValues?: {
    key: string;
    text: string;
    domain: (typeof developmentDomains)[number];
    type: (typeof questionTypes)[number];
    context: (typeof questionContexts)[number];
    stable: boolean;
    active: boolean;
    sortOrder: number;
    options: Array<{
      id: string;
      label: string;
      value: string;
      directionValue: number | null;
      sortOrder: number;
    }>;
  };
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [options, setOptions] = useState<EditableOption[]>(() =>
    defaultValues?.options.length
      ? defaultValues.options.map((option) => ({
          clientId: option.id,
          label: option.label,
          value: option.value,
          directionValue: option.directionValue,
          sortOrder: option.sortOrder,
        }))
      : [blankOption(0), blankOption(1)],
  );

  function updateOption(
    clientId: string,
    field: keyof Omit<EditableOption, "clientId">,
    value: string | number | null,
  ) {
    setOptions((current) =>
      current.map((option) =>
        option.clientId === clientId ? { ...option, [field]: value } : option,
      ),
    );
  }

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormError state={state} />
        <Field data-invalid={Boolean(state.fieldErrors?.key?.length)}>
          <FieldLabel htmlFor="question-key">Key</FieldLabel>
          <Input
            id="question-key"
            name="key"
            defaultValue={defaultValues?.key}
            placeholder="WEEKLY_WORK_START_DELAY"
            aria-invalid={Boolean(state.fieldErrors?.key?.length)}
            disabled={pending}
            required
          />
          <FieldDescription>
            Stable identifier using uppercase letters, numbers, and underscores.
          </FieldDescription>
          <FieldError errors={errorObjects(state.fieldErrors?.key)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.text?.length)}>
          <FieldLabel htmlFor="question-text">Question text</FieldLabel>
          <Textarea
            id="question-text"
            name="text"
            defaultValue={defaultValues?.text}
            aria-invalid={Boolean(state.fieldErrors?.text?.length)}
            disabled={pending}
            required
          />
          <FieldDescription>
            Ask about observable behaviour or a concrete situation, never a psychological trait.
          </FieldDescription>
          <FieldError errors={errorObjects(state.fieldErrors?.text)} />
        </Field>
        <SelectField
          id="question-context"
          name="context"
          label="Use in"
          defaultValue={defaultValues?.context ?? "WEEKLY"}
          placeholder="Select a workflow"
          disabled={pending}
          errors={state.fieldErrors?.context}
          options={questionContexts.map((context) => ({
            value: context,
            label: questionContextLabels[context],
          }))}
        />
        <SelectField
          id="question-domain"
          name="domain"
          label="Domain"
          defaultValue={defaultValues?.domain}
          placeholder="Select a domain"
          disabled={pending}
          errors={state.fieldErrors?.domain}
          options={developmentDomains.map((domain) => ({
            value: domain,
            label: domainLabels[domain],
          }))}
        />
        <SelectField
          id="question-type"
          name="type"
          label="Question type"
          defaultValue={defaultValues?.type}
          placeholder="Select a type"
          disabled={pending}
          errors={state.fieldErrors?.type}
          options={questionTypes.map((type) => ({
            value: type,
            label: questionTypeLabels[type],
          }))}
        />
        <SelectField
          id="question-stable"
          name="stable"
          label="Cadence"
          defaultValue={String(defaultValues?.stable ?? false)}
          placeholder="Select cadence"
          disabled={pending}
          errors={state.fieldErrors?.stable}
          options={[
            { value: "true", label: "Stable weekly question" },
            { value: "false", label: "Rotating question" },
          ]}
        />
        <SelectField
          id="question-active"
          name="active"
          label="Status"
          defaultValue={String(defaultValues?.active ?? true)}
          placeholder="Select status"
          disabled={pending}
          errors={state.fieldErrors?.active}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        <Field data-invalid={Boolean(state.fieldErrors?.sortOrder?.length)}>
          <FieldLabel htmlFor="question-sort-order">Sort order</FieldLabel>
          <Input
            id="question-sort-order"
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={defaultValues?.sortOrder ?? 100}
            aria-invalid={Boolean(state.fieldErrors?.sortOrder?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.sortOrder)} />
        </Field>

        <FieldSet>
          <div className="flex items-center justify-between gap-3">
            <FieldLegend>Answer options</FieldLegend>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOptions((current) => [...current, blankOption(current.length)])}
              disabled={pending || options.length >= 7}
            >
              <Plus data-icon="inline-start" />
              Add option
            </Button>
          </div>
          <FieldDescription>
            Direction values are internal only: 0 means no reported difficulty and 3 means strong reported difficulty.
          </FieldDescription>
          <FieldError errors={errorObjects(state.fieldErrors?.options)} />
          {options.map((option, index) => (
            <FieldGroup key={option.clientId} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Option {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove option ${index + 1}`}
                  onClick={() =>
                    setOptions((current) =>
                      current.filter((item) => item.clientId !== option.clientId),
                    )
                  }
                  disabled={pending || options.length <= 2}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <Field>
                <FieldLabel htmlFor={`option-label-${option.clientId}`}>Label</FieldLabel>
                <Input
                  id={`option-label-${option.clientId}`}
                  name="optionLabel"
                  value={option.label}
                  onChange={(event) =>
                    updateOption(option.clientId, "label", event.target.value)
                  }
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`option-value-${option.clientId}`}>Value</FieldLabel>
                <Input
                  id={`option-value-${option.clientId}`}
                  name="optionValue"
                  value={option.value}
                  onChange={(event) =>
                    updateOption(option.clientId, "value", event.target.value)
                  }
                  placeholder="short-machine-value"
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`option-direction-${option.clientId}`}>
                  Direction value
                </FieldLabel>
                <Input
                  id={`option-direction-${option.clientId}`}
                  name="optionDirectionValue"
                  type="number"
                  min={0}
                  max={3}
                  value={option.directionValue ?? ""}
                  onChange={(event) =>
                    updateOption(
                      option.clientId,
                      "directionValue",
                      event.target.value === "" ? null : Number(event.target.value),
                    )
                  }
                  disabled={pending}
                />
                <FieldDescription>Leave blank for a neutral, uncertain, or not applicable answer.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`option-order-${option.clientId}`}>Sort order</FieldLabel>
                <Input
                  id={`option-order-${option.clientId}`}
                  name="optionSortOrder"
                  type="number"
                  min={0}
                  max={999}
                  value={option.sortOrder}
                  onChange={(event) =>
                    updateOption(
                      option.clientId,
                      "sortOrder",
                      Number(event.target.value),
                    )
                  }
                  disabled={pending}
                  required
                />
              </Field>
            </FieldGroup>
          ))}
        </FieldSet>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            render={<Link href="/admin/questions" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create question"
                : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
