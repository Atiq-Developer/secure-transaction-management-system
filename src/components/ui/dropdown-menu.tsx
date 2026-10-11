"use client";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) { return <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className={cn("z-50 min-w-32 overflow-hidden rounded-lg border bg-card p-1 shadow-md", className)} {...props} /></DropdownMenuPrimitive.Portal>; }
export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) { return <DropdownMenuPrimitive.Item className={cn("relative flex cursor-default select-none items-center rounded-md px-3 py-2 text-sm outline-none focus:bg-muted", className)} {...props} />; }