import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = { title: "Admin overview | SecureTx", description: "SecureTx operational overview and platform health." };
export default function AdminPage() { return <AdminOverview />; }