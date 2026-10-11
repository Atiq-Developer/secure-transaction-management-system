"use client";
import * as React from "react";
import { Controller, FormProvider, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
export const Form = FormProvider;
export function FormField<T extends FieldValues, N extends FieldPath<T>>(props: ControllerProps<T, N>) { return <Controller {...props} />; }
export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("space-y-2", className)} {...props} />; }
export function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) { return <label className={cn("text-sm font-medium", className)} {...props} />; }
export function FormControl({ children }: { children: React.ReactElement }) { return children; }
export function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("text-xs text-muted-foreground", className)} {...props} />; }
export function FormMessage({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { const { formState } = useFormContext(); return <p className={cn("text-xs font-medium text-danger", className)} {...props}>{props.children ?? (formState.errors ? "" : null)}</p>; }