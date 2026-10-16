import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset Password — Cineverse" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session && !error) {
        setRecoveryReady(true);
      }

      setCheckingSession(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (
        session &&
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION")
      ) {
        setRecoveryReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");

      await supabase.auth.signOut();
      await router.navigate({ to: "/auth" });
    } catch {
      toast.error("Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Checking your reset link...
      </main>
    );
  }

  if (!recoveryReady) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Reset link unavailable</h1>
        <p className="max-w-md text-muted-foreground">
          This link may have expired or already been used.
          Request a new password-reset email and open its latest link.
        </p>
        <Button onClick={() => router.navigate({ to: "/auth" })}>
          Back to sign in
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-2xl font-bold">Create a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              Confirm new password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter the password again"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Updating password..." : "Update password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
