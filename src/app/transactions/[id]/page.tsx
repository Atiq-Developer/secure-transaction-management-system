import { Suspense } from "react";
import { TransactionDetailView } from "@/components/transactions/transaction-detail-view";

export default function TransactionDetailPage() { return <Suspense fallback={null}><TransactionDetailView /></Suspense>; }