import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminUsersView } from "@/components/admin/admin-users-view";
export const metadata: Metadata = { title: "Admin users | SecureTx", description: "Manage SecureTx customer access and account status." };
export default function AdminUsersPage() { return <Suspense fallback={null}><AdminUsersView /></Suspense>; }