import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard | SecureTx", description: "Your SecureTx account overview and recent activity." };
export default function DashboardPage() { return <DashboardView />; }