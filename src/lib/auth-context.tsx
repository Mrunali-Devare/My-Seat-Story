import { createContext, useContext, type ReactNode } from "react";
import { useDemoSession, type DemoUser } from "@/lib/demo-auth";

// Demo-only auth: backed by the fake browser session in demo-auth.ts, never by Supabase.
type AuthState = {
  user: DemoUser | null;
  loading: boolean;
  roles: string[];
};

const AuthContext = createContext<AuthState>({ user: null, loading: true, roles: [] });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useDemoSession();
  const roles = user ? [user.role] : [];

  return <AuthContext.Provider value={{ user, loading: !ready, roles }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
