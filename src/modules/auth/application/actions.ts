"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { loginCredentialsSchema } from "@/modules/auth/application/credentials";

export type LoginActionState = {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  email?: string;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten();

    return {
      fieldErrors: flattened.fieldErrors,
      email: typeof formData.get("email") === "string" ? String(formData.get("email")) : "",
    };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return {
        error: "Invalid email or password.",
        email: parsed.data.email,
      };
    }

    throw error;
  }

  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
