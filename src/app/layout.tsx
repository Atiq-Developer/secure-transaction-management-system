import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "SecureTx | Transaction Management", description: "A secure banking-style transaction management system." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${inter.variable} font-sans antialiased`}><ThemeProvider><AuthProvider>{children}</AuthProvider><Toaster position="top-right" richColors /></ThemeProvider></body></html>;
}