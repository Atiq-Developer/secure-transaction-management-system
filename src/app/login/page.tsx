import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in | SecureTx", description: "Sign in to your SecureTx account." };
export default function LoginPage() { return <AuthShell title="Welcome back" subtitle="Sign in to securely manage your money."><LoginForm /></AuthShell>; }