"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { AdminActionState } from "@/modules/admin/application/actions";

import { errorObjects, FormError, SelectField } from "./form-controls";

type SemesterFormAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export function SemesterForm({
  action,
  defaultValues,
  mode,
}: {
  action: SemesterFormAction;
  defaultValues?: {
    name: string;
    startDate: string;
    endDate: string;
    active: boolean;
  };
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormError state={state} />
        <Field data-invalid={Boolean(state.fieldErrors?.name?.length)}>
          <FieldLabel htmlFor="semester-name">Name</FieldLabel>
          <Input
            id="semester-name"
            name="name"
            defaultValue={defaultValues?.name}
            aria-invalid={Boolean(state.fieldErrors?.name?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.name)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.startDate?.length)}>
          <FieldLabel htmlFor="semester-start">Start date</FieldLabel>
          <Input
            id="semester-start"
            name="startDate"
            type="date"
            defaultValue={defaultValues?.startDate}
            aria-invalid={Boolean(state.fieldErrors?.startDate?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.startDate)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.endDate?.length)}>
          <FieldLabel htmlFor="semester-end">End date</FieldLabel>
          <Input
            id="semester-end"
            name="endDate"
            type="date"
            defaultValue={defaultValues?.endDate}
            aria-invalid={Boolean(state.fieldErrors?.endDate?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.endDate)} />
        </Field>
        <SelectField
          id="semester-active"
          name="active"
          label="Status"
          defaultValue={String(defaultValues?.active ?? false)}
          placeholder="Select status"
          disabled={pending}
          errors={state.fieldErrors?.active}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            render={<Link href="/admin/semesters" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create semester"
                : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
