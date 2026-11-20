"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionState } from "@/modules/admin/application/actions";
import { developmentDomains } from "@/modules/admin/domain/schemas";

import { domainLabels } from "./domain-labels";
import { errorObjects, FormError, SelectField } from "./form-controls";

type QuestTemplateFormAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export function QuestTemplateForm({
  action,
  defaultValues,
  mode,
}: {
  action: QuestTemplateFormAction;
  defaultValues?: {
    key: string;
    title: string;
    description: string;
    domain: (typeof developmentDomains)[number];
    active: boolean;
    defaultDurationDays: number;
    reflectionPrompt: string;
  };
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormError state={state} />
        <Field data-invalid={Boolean(state.fieldErrors?.key?.length)}>
          <FieldLabel htmlFor="template-key">Key</FieldLabel>
          <Input
            id="template-key"
            name="key"
            defaultValue={defaultValues?.key}
            placeholder="EARLY_START"
            aria-invalid={Boolean(state.fieldErrors?.key?.length)}
            disabled={pending}
            required
          />
          <FieldDescription>
            Stable identifier using uppercase letters, numbers, and underscores.
          </FieldDescription>
          <FieldError errors={errorObjects(state.fieldErrors?.key)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.title?.length)}>
          <FieldLabel htmlFor="template-title">Title</FieldLabel>
          <Input
            id="template-title"
            name="title"
            defaultValue={defaultValues?.title}
            aria-invalid={Boolean(state.fieldErrors?.title?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.title)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.description?.length)}>
          <FieldLabel htmlFor="template-description">Behavioural experiment</FieldLabel>
          <Textarea
            id="template-description"
            name="description"
            defaultValue={defaultValues?.description}
            aria-invalid={Boolean(state.fieldErrors?.description?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.description)} />
        </Field>
        <SelectField
          id="template-domain"
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
          id="template-active"
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
        <Field data-invalid={Boolean(state.fieldErrors?.defaultDurationDays?.length)}>
          <FieldLabel htmlFor="template-duration">Default duration in days</FieldLabel>
          <Input
            id="template-duration"
            name="defaultDurationDays"
            type="number"
            min={1}
            max={365}
            defaultValue={defaultValues?.defaultDurationDays ?? 7}
            aria-invalid={Boolean(state.fieldErrors?.defaultDurationDays?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.defaultDurationDays)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.reflectionPrompt?.length)}>
          <FieldLabel htmlFor="template-reflection">Reflection prompt</FieldLabel>
          <Textarea
            id="template-reflection"
            name="reflectionPrompt"
            defaultValue={defaultValues?.reflectionPrompt}
            aria-invalid={Boolean(state.fieldErrors?.reflectionPrompt?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.reflectionPrompt)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            render={<Link href="/admin/quest-templates" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create template"
                : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
