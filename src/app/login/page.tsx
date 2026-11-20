import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/application/authorization";
import { homePathForRole } from "@/modules/auth/domain/route-access";
import { LoginForm } from "@/modules/auth/ui/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(homePathForRole(user.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">BTS Mentoring</p>
            <p className="text-sm text-muted-foreground">
              Reflection-led support for first-semester students
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your workspace</CardTitle>
            <CardDescription>
              Use the account provided by your programme administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          Accounts are managed by the programme. Public registration is not
          available.
        </p>
      </div>
    </main>
  );
}
