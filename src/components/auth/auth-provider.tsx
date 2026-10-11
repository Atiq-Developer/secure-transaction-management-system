"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AuthUser = { id: string; fullName: string; email: string; role: "CUSTOMER" | "ADMIN"; status: "ACTIVE" | "FROZEN" };
type AuthContextValue = { user: AuthUser | null; loading: boolean; refreshUser: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json() as { data?: { user?: AuthUser } };
      setUser(payload.data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refreshUser(); }, []);
  return <AuthContext.Provider value={{ user, loading, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useUser(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useUser must be used inside AuthProvider");
  return context;
}