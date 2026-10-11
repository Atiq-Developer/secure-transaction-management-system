import { cn } from "@/lib/utils";
export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div role="alert" className={cn("relative w-full rounded-lg border p-4", className)} {...props} />; }
export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h5 className={cn("mb-1 font-medium", className)} {...props} />; }
export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("text-sm text-muted-foreground", className)} {...props} />; }