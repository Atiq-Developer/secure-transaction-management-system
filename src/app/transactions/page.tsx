import { Suspense } from "react";
import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const metadata: Metadata = { title: "Transactions | SecureTx", description: "Review your complete SecureTx transaction history." };
export default function TransactionsPage() { return <Suspense fallback={null}><TransactionsView /></Suspense>; }