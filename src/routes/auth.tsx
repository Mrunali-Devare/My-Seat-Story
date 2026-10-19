
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — My Seat Story" },
      {
        name: "description",
        content:
          "Sign in or create an account to book movie tickets on My Seat Story.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (active && data.session) {
        await router.navigate({ to: "/" });
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED")
      ) {
        void router.navigate({ to: "/" });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Welcome back!");
      await router.navigate({ to: "/" });
    } catch {
      toast.error("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const name = String(f.get("name") ?? "").trim();

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: name },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        toast.success("Account created successfully!");
        await router.navigate({ to: "/" });
      } else {
        toast.success(
          "Account created. Check your email to confirm your account."
        );
      }
    } catch {
      toast.error("Unable to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const email = resetEmail.trim();

    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "If an account exists for this email, a password-reset link will be sent."
      );
    } catch {
      toast.error("Unable to send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
      }
    } catch {
      toast.error("Unable to sign in with Google.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_50%)]" />

      <div className="container relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-primary to-primary-glow p-1.5 shadow-glow">
            <Film className="size-5 text-primary-foreground" />
          </div>

          <span className="font-display text-xl font-bold">
            <span className="text-gradient-primary">My Seat </span>Story
          </span>
        </Link>

        <div className="w-full rounded-2xl border border-border/60 bg-card/80 p-6 shadow-card backdrop-blur-xl">
          {forgotPassword ? (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">Forgot password?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link
                  to set a password for your account.
                </p>
              </div>

              <form onSubmit={sendResetEmail} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-primary-glow"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => setForgotPassword(false)}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4 pt-4">
                  <form className="space-y-3" onSubmit={signIn}>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@email.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-sm text-primary underline-offset-4 hover:underline"
                        onClick={() => setForgotPassword(true)}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow"
                    >
                      {loading ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 pt-4">
                  <form className="space-y-3" onSubmit={signUp}>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Jane Doe"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@email.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-primary to-primary-glow shadow-glow"
                    >
                      {loading ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or continue with
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="w-full"
                onClick={google}
              >
                Continue with Google
              </Button>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          By continuing you agree to our terms. This is a demo —
          mock payments only.
        </p>
      </div>
    </div>
  );
}
