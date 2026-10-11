import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() { return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="max-w-md text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"><FileQuestion className="size-7" /></div><h1 className="mt-5 text-2xl font-bold text-primary">Page not found</h1><p className="mt-2 text-sm text-muted-foreground">The page you requested does not exist.</p><Button asChild className="mt-6"><Link href="/dashboard">Go to dashboard</Link></Button></div></main>; }