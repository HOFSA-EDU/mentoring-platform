import { CheckCircle2, Construction } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RoleLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  laterItems: string[];
};

export function RoleLanding({
  eyebrow,
  title,
  description,
  laterItems,
}: RoleLandingProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-3xl">
        <Badge variant="secondary" className="mb-4">
          {eyebrow}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      </div>

      <Alert className="max-w-3xl bg-card">
        <Construction aria-hidden="true" />
        <AlertTitle>This workspace is intentionally a placeholder</AlertTitle>
        <AlertDescription>
          Authentication and role boundaries are active. Check-ins, mentoring,
          observations, and Quests remain reserved for later phases.
        </AlertDescription>
      </Alert>

      <Card className="max-w-3xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Foundation status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 text-primary"
              />
              Ready in this phase
            </div>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
              <li>Secure email and password sign-in</li>
              <li>Server-enforced role access</li>
              <li>Authenticated role shell</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Reserved for later phases</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
              {laterItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
