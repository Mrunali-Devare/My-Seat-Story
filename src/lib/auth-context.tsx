import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MANAGER_EMAIL, ensureDemoSession, ensureDemoManager, isDemoEmail } from "@/lib/demo-auth";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
  isDemo: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true, roles: [], isDemo: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    ensureDemoSession().then(() => supabase.auth.getSession()).then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  const userEmail = user?.email;
  useEffect(() => {
    if (!userId) {
      setRoles([]);
      return;
    }
    let cancelled = false;
    (userEmail === DEMO_MANAGER_EMAIL ? ensureDemoManager() : Promise.resolve())
      .then(() => supabase.from("user_roles").select("role").eq("user_id", userId))
      .then(({ data }) => {
        if (!cancelled) setRoles((data ?? []).map((r) => r.role as string));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, userEmail]);

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isDemo: isDemoEmail(user?.email) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
