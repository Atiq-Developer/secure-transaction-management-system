import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminAuditView } from "@/components/admin/admin-audit-view";
export const metadata: Metadata = { title: "Audit logs | SecureTx", description: "Review SecureTx security and operational audit events." };
export default function AdminAuditLogsPage() { return <Suspense fallback={null}><AdminAuditView /></Suspense>; }