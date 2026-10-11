import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <AppShell pageTitle={title}><div className="mx-auto max-w-7xl p-5 sm:p-8"><Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{description}</CardContent></Card></div></AppShell>;
}