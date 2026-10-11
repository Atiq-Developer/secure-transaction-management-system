"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Copy, Loader2, Send, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

type Lookup = { recipient: string | null; verified: boolean };
type Summary = { balance: string; remainingDailyLimit: string };
type Receipt = { reference: string; amount: string; note: string | null; balanceAfterFrom: string | null; createdAt: string };

const errorMessages: Record<string, string> = {
  RECIPIENT_NOT_FOUND: "We could not find that recipient account.",
  SELF_TRANSFER: "You cannot transfer money to your own account.",
  RECIPIENT_FROZEN: "This recipient account is currently frozen.",
  INSUFFICIENT_FUNDS: "Your available balance is not enough for this transfer.",
  LIMIT_EXCEEDED: "The maximum transfer amount is PKR 100,000.",
  DAILY_LIMIT_EXCEEDED: "This transfer would exceed your PKR 200,000 daily limit.",
};

export function TransferView() {
  const searchParams = useSearchParams();
  const [accountNumber, setAccountNumber] = useState(searchParams.get("accountNumber") ?? "");
  const [amount, setAmount] = useState(searchParams.get("amount") ?? "");
  const [note, setNote] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    fetch("/api/account/summary", { cache: "no-store" }).then((response) => response.json()).then((payload: { data?: Summary }) => setSummary(payload.data ?? null)).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    setLookup(null);
    if (!/^\d{10}$/.test(accountNumber)) return;
    const timer = window.setTimeout(async () => {
      setLookupLoading(true);
      try {
        const response = await fetch(`/api/accounts/lookup?accountNumber=${encodeURIComponent(accountNumber)}`);
        const payload = await response.json() as { data?: Lookup };
        setLookup(payload.data ?? { recipient: null, verified: false });
      } finally { setLookupLoading(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [accountNumber]);

  const amountValue = Number(amount);
  const canReview = Boolean(lookup?.verified && amount && Number.isFinite(amountValue) && amountValue > 0 && amountValue <= 100000);

  function openReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReview) { toast.error("Verify the recipient and enter a valid amount first"); return; }
    setIdempotencyKey(crypto.randomUUID());
    setStep("review");
  }

  async function confirmTransfer() {
    if (!idempotencyKey || processing) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toAccountNumber: accountNumber, amount, note, idempotencyKey }) });
      const payload = await response.json() as { data?: { transfer?: Receipt }; error?: { code?: string; message?: string } };
      if (!response.ok) { toast.error(errorMessages[payload.error?.code ?? ""] ?? payload.error?.message ?? "Transfer could not be completed"); setStep("form"); return; }
      setReceipt(payload.data?.transfer ?? null);
      setStep("success");
    } catch { toast.error("We could not reach SecureTx. Your balance was not changed."); setStep("form"); } finally { setProcessing(false); }
  }

  function resetForm() { setAccountNumber(""); setAmount(""); setNote(""); setLookup(null); setReceipt(null); setIdempotencyKey(null); setStep("form"); }
  if (step === "success" && receipt) return <SuccessReceipt receipt={receipt} onAnother={resetForm} />;

  return <AppShell pageTitle="Transfer"><div className="mx-auto max-w-2xl p-5 sm:p-8"><div className="mb-8"><p className="mb-2 text-sm font-medium text-accent">Move money securely</p><h2 className="text-3xl font-bold tracking-tight text-primary">Send a transfer</h2><p className="mt-2 text-muted-foreground">Confirm every detail before money moves.</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Send className="size-4 text-accent" /> Transfer details</CardTitle></CardHeader><CardContent><form className="space-y-5" onSubmit={openReview}><div className="space-y-2"><FieldLabel htmlFor="recipientAccount">Recipient account number</FieldLabel><Input id="recipientAccount" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} required />{lookupLoading && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Verifying account...</p>}{lookup && <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${lookup.verified ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{lookup.verified ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}{lookup.recipient ? `${lookup.recipient} · ${lookup.verified ? "Verified recipient" : "Recipient unavailable"}` : "Account not found"}</div>}</div><div className="space-y-2"><div className="flex items-center justify-between"><FieldLabel htmlFor="transferAmount">Amount</FieldLabel>{summary && <span className="text-xs text-muted-foreground">Available: {formatCurrency(summary.balance)}</span>}</div><div className="relative"><span className="absolute left-3 top-2.5 text-sm font-medium text-muted-foreground">PKR</span><Input id="transferAmount" className="pl-14" type="number" inputMode="decimal" min="1" max="100000" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div className="flex flex-wrap gap-2">{[1000, 5000, 10000].map((quickAmount) => <button type="button" className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent" key={quickAmount} onClick={() => setAmount(String(quickAmount))}>PKR {quickAmount.toLocaleString()}</button>)}</div></div><div className="space-y-2"><FieldLabel htmlFor="note">Note <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Input id="note" maxLength={140} placeholder="What is this transfer for?" value={note} onChange={(event) => setNote(event.target.value)} /><p className="text-right text-xs text-muted-foreground">{note.length}/140</p></div>{summary && <div className="rounded-lg bg-muted/60 p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Remaining daily limit</span><strong>{formatCurrency(summary.remainingDailyLimit)}</strong></div></div>}<Button className="h-11 w-full bg-accent hover:bg-accent/90" disabled={!canReview}><ArrowRight className="size-4" /> Review transfer</Button></form></CardContent></Card><Button variant="ghost" className="mt-4" asChild><a href="/dashboard"><ArrowLeft className="size-4" /> Back to dashboard</a></Button></div><Dialog open={step === "review"} onOpenChange={(open) => { if (!open && !processing) setStep("form"); }}><DialogContent><DialogHeader><DialogTitle>Review transfer</DialogTitle><DialogDescription>Check the details carefully. This action moves money immediately.</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-lg bg-muted p-4"><p className="text-xs text-muted-foreground">Sending to</p><p className="mt-1 font-semibold">{lookup?.recipient}</p><p className="text-sm text-muted-foreground">{accountNumber}</p></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Amount</span><strong>{formatCurrency(amountValue)}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Fee</span><strong>Free</strong></div>{note && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Note</span><span className="text-right">{note}</span></div>}<div className="flex justify-between border-t pt-3"><span className="font-medium">New balance</span><strong>{formatCurrency(Number(summary?.balance ?? 0) - amountValue)}</strong></div></div><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={processing}>Cancel</Button><Button className="flex-1 bg-accent hover:bg-accent/90" onClick={() => void confirmTransfer()} disabled={processing}>{processing && <Loader2 className="size-4 animate-spin" />}Confirm transfer</Button></div></div></DialogContent></Dialog></AppShell>;
}

function SuccessReceipt({ receipt, onAnother }: { receipt: Receipt; onAnother: () => void }) {
  const copyReference = async () => { await navigator.clipboard.writeText(receipt.reference); toast.success("Reference copied"); };
  return <AppShell pageTitle="Transfer complete"><div className="mx-auto max-w-xl p-5 sm:p-8"><Card className="print:border-0 print:shadow-none"><CardContent className="p-7 text-center sm:p-10"><div className="mx-auto grid size-16 animate-pulse place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-9" /></div><h2 className="mt-5 text-2xl font-bold text-primary">Transfer complete</h2><p className="mt-2 text-sm text-muted-foreground">Your money is on its way securely.</p><div className="my-8 space-y-4 rounded-xl bg-muted/60 p-5 text-left"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><strong className="text-lg text-emerald-700">-{formatCurrency(receipt.amount)}</strong></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">New balance</span><strong>{receipt.balanceAfterFrom ? formatCurrency(receipt.balanceAfterFrom) : "-"}</strong></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">Reference</span><button className="flex items-center gap-1 text-sm font-medium text-accent" onClick={copyReference}>{receipt.reference}<Copy className="size-3" /></button></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">Date and time</span><span className="text-sm">{formatDate(receipt.createdAt)}</span></div></div><div className="flex flex-col gap-3 sm:flex-row"><Button variant="outline" className="flex-1 print:hidden" onClick={() => window.print()}>Download receipt</Button><Button className="flex-1 bg-accent hover:bg-accent/90 print:hidden" onClick={onAnother}><Send className="size-4" /> Make another transfer</Button></div><Button variant="ghost" className="mt-3 print:hidden" asChild><a href="/dashboard"><ShieldCheck className="size-4" /> Go to dashboard</a></Button></CardContent></Card></div></AppShell>;
}