"use client";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({ className, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) { return <TooltipPrimitive.Portal><TooltipPrimitive.Content className={cn("z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground", className)} {...props} /></TooltipPrimitive.Portal>; }