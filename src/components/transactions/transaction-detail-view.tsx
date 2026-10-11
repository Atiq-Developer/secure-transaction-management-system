"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CheckCircle2, Copy, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

type Detail = { reference: string; type: string; status: string; direction: "CREDIT" | "DEBIT"; counterparty: string; note: string | null; amount: string; signedAmount: string; balanceAfter: string | null; createdAt: string };

export function TransactionDetailView() {
  const params = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/transactions/${params.id}`, { cache: "no-store" }).then(async (response) => { const payload = await response.json() as { data?: { transaction?: Detail } }; if (!response.ok) throw new Error("Transaction not found"); setTransaction(payload.data?.transaction ?? null); }).catch(() => setTransaction(null)).finally(() => setLoading(false)); }, [params.id]);
  if (loading) return <AppShell pageTitle="Transaction details"><div className="mx-auto max-w-2xl p-5 sm:p-8"><Skeleton className="h-[520px]" /></div></AppShell>;
  if (!transaction) return <AppShell pageTitle="Transaction details"><div className="p-5 sm:p-8"><Card><CardContent className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">Transaction not found or unavailable.</CardContent></Card></div></AppShell>;
  const credit = transaction.direction === "CREDIT";
  const copyReference = async () => { await navigator.clipboard.writeText(transaction.reference); toast.success("Reference copied"); };
  return <AppShell pageTitle="Transaction details"><div className="mx-auto max-w-2xl p-5 sm:p-8"><Button variant="ghost" className="mb-5 print:hidden" asChild><Link href="/transactions"><ArrowLeft className="size-4" /> Back to transactions</Link></Button><Card className="print:border-0 print:shadow-none"><CardContent className="p-7 sm:p-10"><div className="text-center"><div className={`mx-auto grid size-14 place-items-center rounded-full ${credit ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}>{credit ? <ArrowDownLeft /> : <ArrowUpRight />}</div><p className="mt-5 text-sm font-medium text-muted-foreground">{credit ? "Received from" : "Sent to"}</p><h2 className="mt-1 text-2xl font-bold text-primary">{transaction.counterparty}</h2><p className={`mt-4 text-3xl font-bold ${credit ? "text-emerald-700" : "text-primary"}`}>{transaction.signedAmount} PKR</p><Badge variant={transaction.status === "COMPLETED" ? "success" : "destructive"} className="mt-3"><CheckCircle2 className="mr-1 size-3" /> {transaction.status}</Badge></div><div className="my-8 divide-y rounded-xl bg-muted/50 px-5"><DetailRow label="Reference"><button className="flex items-center gap-1 font-medium text-accent" onClick={copyReference}>{transaction.reference}<Copy className="size-3" /></button></DetailRow><DetailRow label="Date and time">{formatDate(transaction.createdAt)}</DetailRow><DetailRow label="Transaction type">{transaction.type}</DetailRow><DetailRow label="Note">{transaction.note ?? "-"}</DetailRow><DetailRow label="Balance after">{transaction.balanceAfter ? formatCurrency(transaction.balanceAfter) : "-"}</DetailRow></div><Button variant="outline" className="w-full print:hidden" onClick={() => window.print()}><Printer className="size-4" /> Print receipt</Button></CardContent></Card></div></AppShell>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) { return <div className="flex items-center justify-between gap-4 py-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right">{children}</span></div>; }