import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";
export const metadata: Metadata = { title: "Settings | SecureTx", description: "Manage your SecureTx profile and account security." };
export default function SettingsPage() { return <SettingsView />; }