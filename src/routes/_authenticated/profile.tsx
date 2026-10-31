import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getProfile, saveProfile } from "@/lib/demo-store";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, roles } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", city: "" });

  // Profiles are stored in this browser; default the name to the demo account's.
  useEffect(() => {
    if (!user) return;
    setForm(getProfile(user.id) ?? { full_name: user.name, phone: "", city: "" });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    saveProfile(user.id, form);
    setSaving(false);
    toast.success("Profile updated");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto max-w-xl px-4 py-10">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

        <form onSubmit={save} className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <Button disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow shadow-glow">Save changes</Button>
        </form>

        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">{roles.length ? roles.join(", ") : "customer"}</p>
        </div>
      </div>
    </div>
  );
}
