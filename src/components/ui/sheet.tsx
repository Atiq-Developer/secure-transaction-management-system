"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export function SheetContent({ className, side = "right", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) { return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" /><DialogPrimitive.Content className={cn("fixed inset-y-0 z-50 w-3/4 border bg-card p-6 shadow-lg", side === "right" ? "right-0" : "left-0", className)} {...props} /></DialogPrimitive.Portal>; }