"use client";

import { useActionState, useState } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  loginAction,
  type LoginActionState,
} from "@/modules/auth/application/actions";

const initialState: LoginActionState = {};

function errorObjects(messages?: string[]) {
  return messages?.map((message) => ({ message }));
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const emailInvalid = Boolean(state.fieldErrors?.email?.length);
  const passwordInvalid = Boolean(state.fieldErrors?.password?.length);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={emailInvalid}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? "email-error" : undefined}
            disabled={pending}
            required
            autoFocus
          />
          <FieldError
            id="email-error"
            errors={errorObjects(state.fieldErrors?.email)}
          />
        </Field>

        <Field data-invalid={passwordInvalid}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={passwordInvalid}
            aria-describedby={passwordInvalid ? "password-error" : undefined}
            disabled={pending}
            required
          />
          <FieldError
            id="password-error"
            errors={errorObjects(state.fieldErrors?.password)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
