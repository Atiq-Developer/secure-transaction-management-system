"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json() as { success: boolean; error?: { message?: string }; data?: { user?: { role: string } } };
      if (!response.ok) { toast.error(payload.error?.message ?? "Unable to sign in"); return; }
      toast.success("Welcome back");
      if (payload.data?.user?.role === "ADMIN") router.push("/admin");
      else router.push("/dashboard");
      router.refresh();
    } catch { toast.error("Unable to reach SecureTx"); } finally { setLoading(false); }
  }

  return <Card><CardContent className="p-6 sm:p-8"><form className="space-y-5" onSubmit={submit}><div className="space-y-2"><FieldLabel htmlFor="email">Email address</FieldLabel><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></div><div className="space-y-2"><div className="flex items-center justify-between"><FieldLabel htmlFor="password">Password</FieldLabel><button type="button" className="text-xs font-medium text-accent">Forgot password?</button></div><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required className="pr-11" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div><Button className="h-11 w-full bg-accent hover:bg-accent/90" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />}Sign in</Button></form><p className="mt-6 text-center text-sm text-muted-foreground">New to SecureTx? <Link className="font-semibold text-accent hover:underline" href="/register">Create an account</Link></p></CardContent></Card>;
}