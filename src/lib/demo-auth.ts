import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Demo mode: nobody logs in (one shared demo session). A "persona" is a taste profile,
// switchable from the header so different recommendations can be shown.
export type DemoPersona = { id: string; name: string; tagline: string; genres: string[] };

export const DEMO_PERSONAS: DemoPersona[] = [
  { id: "action", name: "Arjun", tagline: "Action & thriller fan", genres: ["Action", "Thriller", "Crime"] },
  { id: "romcom", name: "Priya", tagline: "Romance & comedy lover", genres: ["Romance", "Comedy"] },
  { id: "scifi", name: "Kabir", tagline: "Sci-fi & adventure geek", genres: ["Sci-Fi", "Science Fiction", "Adventure", "Fantasy"] },
  { id: "drama", name: "Meera", tagline: "Drama & biopic watcher", genres: ["Drama", "Biography", "History"] },
  { id: "horror", name: "Rohan", tagline: "Horror & mystery buff", genres: ["Horror", "Mystery"] },
  { id: "family", name: "Anaya", tagline: "Family & animation", genres: ["Animation", "Family"] },
];

export const PERSONA_EVENT = "cineverse-persona-changed";
const PERSONA_KEY = "cineverse-demo-persona";
const DEMO_PASSWORD = "cineverse-demo-2026";
const DEMO_EMAIL = "demo@cineverse.app";

export function getActivePersona(): DemoPersona {
  try {
    const id = localStorage.getItem(PERSONA_KEY);
    return DEMO_PERSONAS.find((p) => p.id === id) ?? DEMO_PERSONAS[0];
  } catch {
    return DEMO_PERSONAS[0];
  }
}

export type DemoKind = "user" | "manager";
export const DEMO_MANAGER_EMAIL = "manager@cineverse.app";
const DEMO_ACCOUNTS: Record<DemoKind, { email: string; name: string }> = {
  user: { email: "demo@cineverse.app", name: "Demo User" },
  manager: { email: DEMO_MANAGER_EMAIL, name: "Demo Manager" },
};

export const isDemoEmail = (email?: string | null) =>
  !!email && Object.values(DEMO_ACCOUNTS).some((a) => a.email === email);

/** Signs in as the shared demo account of the given kind, creating it on first use. */
export async function signInAsDemo(kind: DemoKind): Promise<string | null> {
  const { email, name } = DEMO_ACCOUNTS[kind];
  const signedIn = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (!signedIn.error) return null;

  const signedUp = await supabase.auth.signUp({
    email,
    password: DEMO_PASSWORD,
    options: { data: { full_name: name } },
  });
  if (signedUp.error) return signedUp.error.message;
  // Sign-up only returns a session when email confirmation is disabled in Supabase.
  if (!signedUp.data.session) {
    const retry = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
    return retry.error?.message ?? null;
  }
  return null;
}

/** When true there is no login screen: everyone is signed in as the demo manager. Set false to use real sign-in. */
export const AUTO_DEMO = true;

let pendingAuto: Promise<void> | null = null;

/** In AUTO_DEMO mode, makes sure a demo manager session exists. Safe to call concurrently. */
export function ensureDemoSession(): Promise<void> {
  if (!AUTO_DEMO || typeof window === "undefined") return Promise.resolve();
  if (!pendingAuto) {
    pendingAuto = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const error = await signInAsDemo("manager");
        if (error) console.error("Demo sign-in failed:", error);
      }
    })().finally(() => {
      pendingAuto = null;
    });
  }
  return pendingAuto;
}

/** Switches the active persona. Instant: personas only change the taste profile, not the session. */
export function switchPersona(id: string) {
  const persona = DEMO_PERSONAS.find((p) => p.id === id);
  if (!persona) return;
  try {
    localStorage.setItem(PERSONA_KEY, persona.id);
  } catch {
    // storage unavailable; the switch still applies for this session
  }
  window.dispatchEvent(new Event(PERSONA_EVENT));
}

/** Grants the demo manager account its role (server-side check; no-op for any other account). */
export async function ensureDemoManager() {
  await supabase.rpc("ensure_demo_manager");
}

/** Active persona, updating whenever it is switched. */
export function usePersona(): DemoPersona {
  const [persona, setPersona] = useState(DEMO_PERSONAS[0]);
  useEffect(() => {
    const sync = () => setPersona(getActivePersona());
    sync();
    window.addEventListener(PERSONA_EVENT, sync);
    return () => window.removeEventListener(PERSONA_EVENT, sync);
  }, []);
  return persona;
}
