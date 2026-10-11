"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>{children}</NextThemesProvider>;
}