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
import type {
  AdminActionState,
} from "@/modules/admin/application/actions";

import { errorObjects, FormError, SelectField } from "./form-controls";

type AccountFormAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

const initialState: AdminActionState = {};

export function StudentForm({
  action,
  semesters,
  defaultValues,
  mode,
}: {
  action: AccountFormAction;
  semesters: Array<{ id: string; name: string; active: boolean }>;
  defaultValues?: { name: string; email: string; semesterId: string };
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormError state={state} />
        <Field data-invalid={Boolean(state.fieldErrors?.name?.length)}>
          <FieldLabel htmlFor="student-name">Name</FieldLabel>
          <Input
            id="student-name"
            name="name"
            defaultValue={defaultValues?.name}
            aria-invalid={Boolean(state.fieldErrors?.name?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.name)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.email?.length)}>
          <FieldLabel htmlFor="student-email">Email</FieldLabel>
          <Input
            id="student-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaultValues?.email}
            aria-invalid={Boolean(state.fieldErrors?.email?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.email)} />
        </Field>
        {mode === "create" ? (
          <Field data-invalid={Boolean(state.fieldErrors?.password?.length)}>
            <FieldLabel htmlFor="student-password">Initial password</FieldLabel>
            <Input
              id="student-password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(state.fieldErrors?.password?.length)}
              disabled={pending}
              required
            />
            <FieldDescription>
              At least 12 characters with uppercase, lowercase, number, and symbol.
            </FieldDescription>
            <FieldError errors={errorObjects(state.fieldErrors?.password)} />
          </Field>
        ) : null}
        <SelectField
          id="student-semester"
          name="semesterId"
          label="Semester"
          defaultValue={defaultValues?.semesterId}
          placeholder="Select a semester"
          disabled={pending}
          errors={state.fieldErrors?.semesterId}
          options={semesters.map((semester) => ({
            value: semester.id,
            label: `${semester.name}${semester.active ? " · Active" : ""}`,
          }))}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            render={<Link href="/admin/students" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create student"
                : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function MentorForm({
  action,
  defaultValues,
  mode,
}: {
  action: AccountFormAction;
  defaultValues?: { name: string; email: string };
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormError state={state} />
        <Field data-invalid={Boolean(state.fieldErrors?.name?.length)}>
          <FieldLabel htmlFor="mentor-name">Name</FieldLabel>
          <Input
            id="mentor-name"
            name="name"
            defaultValue={defaultValues?.name}
            aria-invalid={Boolean(state.fieldErrors?.name?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.name)} />
        </Field>
        <Field data-invalid={Boolean(state.fieldErrors?.email?.length)}>
          <FieldLabel htmlFor="mentor-email">Email</FieldLabel>
          <Input
            id="mentor-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaultValues?.email}
            aria-invalid={Boolean(state.fieldErrors?.email?.length)}
            disabled={pending}
            required
          />
          <FieldError errors={errorObjects(state.fieldErrors?.email)} />
        </Field>
        {mode === "create" ? (
          <Field data-invalid={Boolean(state.fieldErrors?.password?.length)}>
            <FieldLabel htmlFor="mentor-password">Initial password</FieldLabel>
            <Input
              id="mentor-password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(state.fieldErrors?.password?.length)}
              disabled={pending}
              required
            />
            <FieldDescription>
              At least 12 characters with uppercase, lowercase, number, and symbol.
            </FieldDescription>
            <FieldError errors={errorObjects(state.fieldErrors?.password)} />
          </Field>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            render={<Link href="/admin/mentors" />}
            nativeButton={false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Create mentor"
                : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
