"use client";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
export function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) { return <AvatarPrimitive.Root className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full", className)} {...props} />; }
export const AvatarImage = AvatarPrimitive.Image;
export function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) { return <AvatarPrimitive.Fallback className={cn("grid size-full place-items-center bg-muted text-sm font-medium", className)} {...props} />; }