import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminTransactionsView } from "@/components/admin/admin-transactions-view";
export const metadata: Metadata = { title: "Admin transactions | SecureTx", description: "Review all SecureTx transaction activity." };
export default function AdminTransactionsPage() { return <Suspense fallback={null}><AdminTransactionsView /></Suspense>; }