import { Handshake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSubmissionDate } from "@/modules/check-ins/ui/format";

export type StudentAgreement = { id: string; text: string; occurredAt: Date };
export function StudentAgreements({ agreements }: { agreements: StudentAgreement[] }) {
  return <section aria-labelledby="agreements-title" className="flex min-w-0 flex-col gap-3 break-words">
    <h2 id="agreements-title" className="flex items-center gap-2 text-lg font-semibold"><Handshake aria-hidden="true" className="size-5 shrink-0" />Agreed with your Mentor</h2>
    {agreements.length ? <ol className="flex flex-col gap-3">{agreements.map((agreement) => <li key={agreement.id}><Card size="sm"><CardHeader>
      <CardTitle className="sr-only">Shared agreement</CardTitle><CardDescription>Conversation: {formatSubmissionDate(agreement.occurredAt)}</CardDescription></CardHeader>
      <CardContent><p className="whitespace-pre-wrap leading-7">{agreement.text}</p></CardContent>
    </Card></li>)}</ol> : <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No shared agreements yet.</p>}
  </section>;
}
