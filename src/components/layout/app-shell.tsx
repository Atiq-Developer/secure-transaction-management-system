"use client";

import { useState } from "react";
import { Bell, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, ReceiptText, Settings, ShieldCheck, Sun, ArrowLeftRight, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useUser } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transfer", href: "/transfer", icon: ArrowLeftRight },
  { label: "Transactions", href: "/transactions", icon: ReceiptText },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Navigation({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useUser();
  return <nav className="space-y-1">{navigation.map(({ label, href, icon: Icon }) => <a href={href} key={href} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", pathname === href ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/8 hover:text-white", collapsed && "justify-center px-2")}><Icon className="size-[18px] shrink-0" /><span className={cn(collapsed && "sr-only")}>{label}</span></a>)}{user?.role === "ADMIN" && <><Separator className="my-5 bg-white/15" /><p className={cn("mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40", collapsed && "sr-only")}>Administration</p>{[{ label: "Admin overview", href: "/admin", icon: ShieldCheck }, { label: "Users", href: "/admin/users", icon: UserRound }, { label: "Transactions", href: "/admin/transactions", icon: ReceiptText }, { label: "Audit logs", href: "/admin/audit-logs", icon: ClipboardList }].map(({ label, href, icon: Icon }) => <a href={href} key={href} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white", pathname === href ? "bg-white/12 text-white" : "", collapsed && "justify-center px-2")}><Icon className="size-[18px] shrink-0" /><span className={cn(collapsed && "sr-only")}>{label}</span></a>)}</>}</nav>;
}

export function AppShell({ children, pageTitle }: Readonly<{ children: React.ReactNode; pageTitle: string }>) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const initials = user?.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "ST";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("You have been signed out");
    router.push("/login");
    router.refresh();
  }

  return <div className="min-h-screen bg-background lg:flex"><aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col bg-primary p-5 text-primary-foreground transition-all duration-200 lg:flex", collapsed ? "w-[76px]" : "w-64")}><div className={cn("mb-10 flex items-center gap-3 px-1", collapsed && "justify-center")}><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent"><ShieldCheck className="size-5" /></span><span className={cn("text-lg font-bold tracking-tight", collapsed && "sr-only")}>SecureTx</span></div><Navigation collapsed={collapsed} /><div className="mt-auto"><Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</Button></div></aside>
    <div className={cn("min-w-0 flex-1 transition-[margin] duration-200", collapsed ? "lg:ml-[76px]" : "lg:ml-64")}><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-5 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger><SheetContent side="left" className="w-72 border-0 bg-primary p-5 text-white"><SheetTitle className="sr-only">SecureTx navigation</SheetTitle><div className="mb-10 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-accent"><ShieldCheck className="size-5" /></span><span className="text-lg font-bold">SecureTx</span></div><SheetClose asChild><div><Navigation onNavigate={() => setMobileOpen(false)} /></div></SheetClose></SheetContent></Sheet><div><p className="text-xs font-medium text-muted-foreground">SecureTx workspace</p><h1 className="text-lg font-semibold text-primary">{pageTitle}</h1></div></div><div className="flex items-center gap-1 sm:gap-2"><Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun /> : <Moon />}</Button><Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button><Separator orientation="vertical" className="mx-1 hidden h-7 sm:block" /><DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-muted"><Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar><span className="hidden max-w-32 sm:block"><span className="block truncate text-sm font-semibold">{user?.fullName ?? "Account"}</span><span className="block truncate text-xs text-muted-foreground">{user?.email}</span></span></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><div className="px-3 py-2"><p className="truncate text-sm font-semibold">{user?.fullName}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p><Badge className="mt-2" variant="secondary">{user?.role ?? "CUSTOMER"}</Badge></div><Separator className="my-1" /><DropdownMenuItem onSelect={() => void logout()}><LogOut className="mr-2 size-4" /> Log out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header><main>{children}</main></div>
  </div>;
}