"use client";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const signals = [
  { value: "ALL", label: "All responses" }, { value: "YES", label: "Yes — would like to talk" },
  { value: "MAYBE", label: "Maybe — conversation might help" }, { value: "NO", label: "No request" },
];
export function StudentFilters({ query, signal, change }: { query: string; signal: string; change: string }) {
  return <form action="/mentor/students" method="get">
    <FieldGroup className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
      <Field><FieldLabel htmlFor="student-search">Search by name</FieldLabel>
        <Input id="student-search" name="q" defaultValue={query} maxLength={100} placeholder="Student name" className="min-h-11" /></Field>
      <Field><FieldLabel htmlFor="signal-filter">Recent conversation response</FieldLabel>
        <Select name="signal" defaultValue={signal} items={signals}>
          <SelectTrigger id="signal-filter" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>{signals.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
        </Select></Field>
      <Field><FieldLabel htmlFor="change-filter">Recent change</FieldLabel>
        <Select name="change" defaultValue={change} items={[{ value: "ALL", label: "All students" }, { value: "MORE_DIFFICULT", label: "Reported as more difficult" }]}>
          <SelectTrigger id="change-filter" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="ALL">All students</SelectItem><SelectItem value="MORE_DIFFICULT">Reported as more difficult</SelectItem></SelectGroup></SelectContent>
        </Select></Field>
      <div className="flex items-center gap-3"><Button type="submit" className="min-h-11"><Search data-icon="inline-start" />Apply</Button>
        <Link href="/mentor/students" className="inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Reset</Link></div>
    </FieldGroup>
  </form>;
}
