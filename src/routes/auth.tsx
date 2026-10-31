import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, User as UserIcon } from "lucide-react";
import logo from "@/assets/My Seat Story Cinema Logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AUTO_DEMO } from "@/lib/demo-auth";
import { supabase } from "@/integrations/supabase/client";
import { signInAsDemo, type DemoKind } from "@/lib/demo-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    if (AUTO_DEMO) throw redirect({ to: "/manager" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — My Seat Story" },
      { name: "description", content: "Sign in or create an account to book movie tickets on My Seat Story." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/" });
    });
  }, [router]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    router.navigate({ to: "/" });
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: { data: { full_name: String(f.get("name") || "") } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (!data.session) return toast.message("Account created. Please sign in.");
    toast.success("Account created. You're signed in!");
    router.navigate({ to: "/" });
  };

  const demo = async (kind: DemoKind) => {
    setLoading(true);
    const error = await signInAsDemo(kind);
    setLoading(false);
    if (error) return toast.error(`Demo sign-in failed: ${error}`);
    router.navigate({ to: kind === "manager" ? "/manager" : "/" });
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
              <form className="space-y-3" onSubmit={signIn}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow">Sign in</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-4">
              <form className="space-y-3" onSubmit={signUp}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" name="email" type="email" required placeholder="you@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Password</Label>
                  <Input id="password2" name="password" type="password" required minLength={6} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow">Create account</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or try the demo <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" disabled={loading} onClick={() => demo("user")}>
              <UserIcon className="mr-2 size-4" /> Demo user
            </Button>
            <Button type="button" variant="outline" disabled={loading} onClick={() => demo("manager")}>
              <Shield className="mr-2 size-4" /> Demo manager
            </Button>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          By continuing you agree to our terms. This is a demo — mock payments only.
        </p>
      </div>
    </div>
  );
}
