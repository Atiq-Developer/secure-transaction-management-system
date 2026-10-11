"use client";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;
export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) { return <SelectPrimitive.Trigger className={cn("flex h-10 w-full items-center justify-between rounded-lg border bg-card px-3 text-sm", className)} {...props}>{children}<ChevronDown className="size-4 opacity-50" /></SelectPrimitive.Trigger>; }
export function SelectContent({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) { return <SelectPrimitive.Portal><SelectPrimitive.Content className={cn("z-50 overflow-hidden rounded-lg border bg-card shadow-md", className)} {...props} /></SelectPrimitive.Portal>; }
export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) { return <SelectPrimitive.Item className={cn("relative flex cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none focus:bg-muted", className)} {...props}><span className="absolute left-2"><SelectPrimitive.ItemIndicator><Check className="size-4" /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>; }