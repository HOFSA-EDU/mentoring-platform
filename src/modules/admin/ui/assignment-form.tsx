"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  assignMentorAction,
  type AdminActionState,
} from "@/modules/admin/application/actions";

import { FormError, SelectField } from "./form-controls";

export function AssignmentForm({
  students,
  mentors,
}: {
  students: Array<{ id: string; name: string }>;
  mentors: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState<
    AdminActionState,
    FormData
  >(assignMentorAction, {});

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormError state={state} />
        <SelectField
          id="assignment-student"
          name="studentProfileId"
          label="Student"
          placeholder="Select a student"
          disabled={pending}
          errors={state.fieldErrors?.studentProfileId}
          options={students.map((student) => ({
            value: student.id,
            label: student.name,
          }))}
        />
        <SelectField
          id="assignment-mentor"
          name="mentorProfileId"
          label="Mentor"
          placeholder="Select a mentor"
          disabled={pending}
          errors={state.fieldErrors?.mentorProfileId}
          options={mentors.map((mentor) => ({
            value: mentor.id,
            label: mentor.name,
          }))}
        />
        <Button type="submit" disabled={pending} className="sm:self-start">
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Assigning…" : "Assign mentor"}
        </Button>
      </FieldGroup>
    </form>
  );
}
