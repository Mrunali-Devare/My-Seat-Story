import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Shield, User as UserIcon, Users } from "lucide-react";
import logo from "@/assets/My Seat Story Cinema Logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEMO_PASSWORD, DEMO_USERS, getCurrentUser, signIn, signUp, type DemoUser } from "@/lib/demo-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — My Seat Story" },
      { name: "description", content: "Sign in or create an account to book movie tickets on My Seat Story." },
    ],
  }),
  component: AuthPage,
});

// Small pause so signing in feels like a real request.
const fakeLatency = () => new Promise((r) => setTimeout(r, 450));

function AuthPage() {
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [quickUser, setQuickUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const goNext = (user: DemoUser) => {
    // Only follow same-site paths from the redirect param.
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      router.history.push(redirect);
    } else {
      router.navigate({ to: user.role === "manager" ? "/manager" : "/" });
    }
  };

  // Already signed in: skip the login screen.
  useEffect(() => {
    const user = getCurrentUser();
    if (user) goNext(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickQuickUser = (id: string) => {
    const user = DEMO_USERS.find((u) => u.id === id);
    if (!user) return;
    setQuickUser(id);
    setEmail(user.email);
    setPassword(DEMO_PASSWORD);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await fakeLatency();
    const error = signIn(email, password);
    setLoading(false);
    if (error) return toast.error(error);
    const user = getCurrentUser()!;
    toast.success(`Welcome back, ${user.name}!`);
    goNext(user);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    await fakeLatency();
    const error = signUp(String(f.get("name") ?? ""), String(f.get("email") ?? ""), String(f.get("password") ?? ""));
    setLoading(false);
    if (error) return toast.error(error);
    const user = getCurrentUser()!;
    toast.success(`Account created. Welcome, ${user.name}!`);
    goNext(user);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_50%)]" />
      <div className="container relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <img src={logo} alt="My Seat Story" className="h-20 w-auto" />
        </Link>

        <div className="w-full rounded-2xl border border-border/60 bg-card/80 p-6 shadow-card backdrop-blur-xl">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 pt-4">
              {/* Quick user picker: fills the form with a demo account */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" /> Demo account
                </span>
                <Select value={quickUser} onValueChange={pickQuickUser}>
                  <SelectTrigger aria-label="Choose a demo user" className="h-8 w-[220px] text-xs [&>span]:truncate">
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_USERS.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        <span className="flex items-center gap-2">
                          {u.role === "manager" ? <Shield className="size-3.5" /> : <UserIcon className="size-3.5" />}
                          {u.name}
                          <span className="text-muted-foreground">· {u.role === "manager" ? "Manager" : u.tagline}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <form className="space-y-3" onSubmit={handleSignIn}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setQuickUser("");
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => toast.info(`Demo accounts all use the password "${DEMO_PASSWORD}".`)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      minLength={6}
                      className="pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-4">
              <form className="space-y-3" onSubmit={handleSignUp}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" autoComplete="name" placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" name="email" type="email" autoComplete="email" required placeholder="you@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Password</Label>
                  <Input id="password2" name="password" type="password" autoComplete="new-password" required minLength={6} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo site: accounts and bookings are saved only in this browser. Payments are simulated.
        </p>
      </div>
    </div>
  );
}
