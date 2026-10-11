import { Suspense } from "react";
import type { Metadata } from "next";
import { TransferView } from "@/components/transfer/transfer-view";
export const metadata: Metadata = { title: "Transfer | SecureTx", description: "Send money securely with SecureTx." };
export default function TransferPage() { return <Suspense fallback={null}><TransferView /></Suspense>; }