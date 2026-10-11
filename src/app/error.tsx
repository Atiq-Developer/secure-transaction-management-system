"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="max-w-md text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="size-7" /></div><h1 className="mt-5 text-2xl font-bold text-primary">Something went wrong</h1><p className="mt-2 text-sm text-muted-foreground">SecureTx could not complete that request. No money was moved.</p><Button className="mt-6" onClick={reset}>Try again</Button></div></main>;
}