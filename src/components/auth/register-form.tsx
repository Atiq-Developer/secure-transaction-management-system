"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/label";

const rules = [{ label: "8 characters", test: (value: string) => value.length >= 8 }, { label: "An uppercase letter", test: (value: string) => /[A-Z]/.test(value) }, { label: "A lowercase letter", test: (value: string) => /[a-z]/.test(value) }, { label: "A number", test: (value: string) => /[0-9]/.test(value) }, { label: "A special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) }];

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const passedRules = useMemo(() => rules.filter((rule) => rule.test(values.password)).length, [values.password]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passedRules !== rules.length) { toast.error("Please meet all password requirements"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok) { toast.error(payload.error?.message ?? "Unable to create account"); return; }
      toast.success("Account created with PKR 50,000 opening balance");
      router.push("/dashboard");
      router.refresh();
    } catch { toast.error("Unable to reach SecureTx"); } finally { setLoading(false); }
  }

  return <Card><CardContent className="p-6 sm:p-8"><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><FieldLabel htmlFor="fullName">Full name</FieldLabel><Input id="fullName" autoComplete="name" placeholder="Your full name" required minLength={2} maxLength={60} value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} /></div><div className="space-y-2"><FieldLabel htmlFor="email">Email address</FieldLabel><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></div><div className="space-y-2"><FieldLabel htmlFor="password">Create a password</FieldLabel><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Make it memorable and strong" required className="pr-11" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><div className="flex gap-1 pt-1">{rules.map((rule) => <span className={`h-1.5 flex-1 rounded-full ${rule.test(values.password) ? "bg-accent" : "bg-muted"}`} key={rule.label} />)}</div><div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">{rules.map((rule) => <span className="flex items-center gap-1" key={rule.label}>{rule.test(values.password) ? <Check className="size-3 text-accent" /> : <X className="size-3" />}{rule.label}</span>)}</div></div><Button className="mt-2 h-11 w-full bg-accent hover:bg-accent/90" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />}Create secure account</Button></form><p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-semibold text-accent hover:underline" href="/login">Sign in</Link></p></CardContent></Card>;
}