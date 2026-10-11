"use client";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
export const Label = LabelPrimitive.Root;
export function FieldLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) { return <LabelPrimitive.Root className={cn("text-sm font-medium leading-none", className)} {...props} />; }