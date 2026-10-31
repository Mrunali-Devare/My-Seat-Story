import { useEffect, useState } from "react";

// Fake, browser-only auth for the demo. Nothing here talks to a server: the "session"
// is just the signed-in user's id in localStorage. Every demo account uses DEMO_PASSWORD.

export type DemoRole = "customer" | "manager";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  tagline: string;
  /** Taste profile used for "Picked for you" recommendations. */
  genres: string[];
};

export const DEMO_PASSWORD = "demo1234";

/** Shared data (movies, shows) can't be changed without real auth, so manager writes are blocked. */
export const DEMO_READ_ONLY: boolean = true;
export const DEMO_READ_ONLY_MESSAGE = "Demo mode: manager changes are disabled.";

export const DEMO_USERS: DemoUser[] = [
  { id: "demo-manager", name: "Demo Manager", email: "manager@myseatstory.app", role: "manager", tagline: "Theater manager · dashboard access", genres: ["Action", "Drama"] },
  { id: "demo-arjun", name: "Arjun", email: "arjun@myseatstory.app", role: "customer", tagline: "Action & thriller fan", genres: ["Action", "Thriller", "Crime"] },
  { id: "demo-priya", name: "Priya", email: "priya@myseatstory.app", role: "customer", tagline: "Romance & comedy lover", genres: ["Romance", "Comedy"] },
  { id: "demo-kabir", name: "Kabir", email: "kabir@myseatstory.app", role: "customer", tagline: "Sci-fi & adventure geek", genres: ["Sci-Fi", "Science Fiction", "Adventure", "Fantasy"] },
  { id: "demo-meera", name: "Meera", email: "meera@myseatstory.app", role: "customer", tagline: "Drama & biopic watcher", genres: ["Drama", "Biography", "History"] },
  { id: "demo-rohan", name: "Rohan", email: "rohan@myseatstory.app", role: "customer", tagline: "Horror & mystery buff", genres: ["Horror", "Mystery"] },
  { id: "demo-anaya", name: "Anaya", email: "anaya@myseatstory.app", role: "customer", tagline: "Family & animation", genres: ["Animation", "Family"] },
];

const SESSION_KEY = "mss-demo-session";
const ACCOUNTS_KEY = "mss-demo-accounts";
export const SESSION_EVENT = "mss-demo-session-changed";

type StoredAccount = DemoUser & { password: string };

const isBrowser = () => typeof window !== "undefined";

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Accounts created through the "Create account" tab (kept in this browser only). */
function getCreatedAccounts(): StoredAccount[] {
  const accounts = readJson<StoredAccount[]>(ACCOUNTS_KEY, []);
  return Array.isArray(accounts) ? accounts : [];
}

function allAccounts(): StoredAccount[] {
  return [...DEMO_USERS.map((u) => ({ ...u, password: DEMO_PASSWORD })), ...getCreatedAccounts()];
}

function toUser({ password: _password, ...user }: StoredAccount): DemoUser {
  return user;
}

function setSession(userId: string | null) {
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** The signed-in user, or null. Always null during SSR. */
export function getCurrentUser(): DemoUser | null {
  if (!isBrowser()) return null;
  const id = localStorage.getItem(SESSION_KEY);
  const account = id ? allAccounts().find((a) => a.id === id) : undefined;
  return account ? toUser(account) : null;
}

/** Email + password sign-in. Returns an error message, or null on success. */
export function signIn(email: string, password: string): string | null {
  const account = allAccounts().find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || account.password !== password) return "Invalid email or password";
  setSession(account.id);
  return null;
}

/** Instantly signs in as a demo user (used by the user switcher). */
export function signInAs(userId: string) {
  if (allAccounts().some((a) => a.id === userId)) setSession(userId);
}

export function signOut() {
  setSession(null);
}

/** Creates a customer account in this browser and signs in. Returns an error message, or null. */
export function signUp(name: string, email: string, password: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (allAccounts().some((a) => a.email.toLowerCase() === normalized)) {
    return "An account with this email already exists";
  }
  const account: StoredAccount = {
    id: `local-${Date.now().toString(36)}`,
    name: name.trim() || normalized.split("@")[0],
    email: normalized,
    role: "customer",
    tagline: "New member",
    genres: [],
    password,
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...getCreatedAccounts(), account]));
  setSession(account.id);
  return null;
}

/** Signed-in user, updating on sign-in/out (also across tabs). `ready` is false until read on the client. */
export function useDemoSession(): { user: DemoUser | null; ready: boolean } {
  const [state, setState] = useState<{ user: DemoUser | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => {
    const sync = () => setState({ user: getCurrentUser(), ready: true });
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}

/** Taste profile for recommendations: the signed-in user's, falling back to the first customer. */
export function usePersona(): DemoUser {
  const { user } = useDemoSession();
  return user && user.genres.length > 0 ? user : DEMO_USERS.find((u) => u.role === "customer")!;
}
