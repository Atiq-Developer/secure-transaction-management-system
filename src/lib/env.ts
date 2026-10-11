import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
});

export function getEnv() {
  const result = envSchema.safeParse({ DATABASE_URL: process.env.DATABASE_URL, JWT_SECRET: process.env.JWT_SECRET });
  if (!result.success) throw new Error(`Invalid environment configuration: ${result.error.issues.map((issue) => issue.message).join("; ")}`);
  return result.data;
}