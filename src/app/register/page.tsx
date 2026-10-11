import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account | SecureTx", description: "Create a secure SecureTx demo account." };
export default function RegisterPage() { return <AuthShell title="Start with SecureTx" subtitle="Create your account and get a PKR 50,000 demo opening balance."><RegisterForm /></AuthShell>; }