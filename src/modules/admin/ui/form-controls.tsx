"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminActionState } from "@/modules/admin/application/actions";

export function errorObjects(messages?: string[]) {
  return messages?.map((message) => ({ message }));
}

export function FormError({ state }: { state: AdminActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  );
}

export function SelectField({
  id,
  name,
  label,
  defaultValue,
  placeholder,
  options,
  errors,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  errors?: string[];
  disabled?: boolean;
}) {
  const invalid = Boolean(errors?.length);

  return (
    <Field data-invalid={invalid} data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        required
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError errors={errorObjects(errors)} />
    </Field>
  );
}
