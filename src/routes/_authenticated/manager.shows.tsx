import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { inr, formatShowDateOnly, formatShowTimeOnly } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manager/shows")({
  component: ManagerShows,
});

function ManagerShows() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ movie_id: "", screen_id: "", start_time: "", base_price: "250" });

  const { data: shows = [] } = useQuery({
    queryKey: ["mgr-shows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select("id, start_time, base_price, movies(title), screens(name, theaters(name))")
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: movies = [] } = useQuery({
    queryKey: ["mgr-movies"],
    queryFn: async () => (await supabase.from("movies").select("id,title").order("title")).data ?? [],
  });

  const { data: screens = [] } = useQuery({
    queryKey: ["mgr-screens"],
    queryFn: async () => (await supabase.from("screens").select("id,name,theaters(name)").order("name")).data ?? [],
  });

  const create = async () => {
    if (!form.movie_id || !form.screen_id || !form.start_time) return toast.error("Fill all fields");
    const { error } = await supabase.rpc("create_show_with_seats", {
      p_screen_id: form.screen_id,
      p_movie_id: form.movie_id,
      p_start_time: new Date(form.start_time).toISOString(),
      p_base_price: Number(form.base_price),
    });
    if (error) return toast.error(error.message);
    toast.success("Show created with seats generated");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["mgr-shows"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this show? All seats and bookings linked will be cascaded.")) return;
    const { error } = await supabase.from("shows").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["mgr-shows"] });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow shadow-glow"><Plus className="mr-2 size-4" /> New show</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule a show</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Movie</Label>
                <Select value={form.movie_id} onValueChange={(v) => setForm({ ...form, movie_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a movie" /></SelectTrigger>
                  <SelectContent>{movies.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Screen</Label>
                <Select value={form.screen_id} onValueChange={(v) => setForm({ ...form, screen_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a screen" /></SelectTrigger>
                  <SelectContent>{screens.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.theaters?.name} · {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Base price (INR)</Label>
                <Input type="number" min={50} value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} className="bg-gradient-to-r from-primary to-primary-glow shadow-glow">Create show</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-4">Movie</th><th className="p-4">Theater / Screen</th><th className="p-4">When</th><th className="p-4">Price</th><th /></tr>
          </thead>
          <tbody>
            {shows.map((s: any) => (
              <tr key={s.id} className="border-b border-border/40 last:border-0">
                <td className="p-4 font-medium">{s.movies?.title}</td>
                <td className="p-4 text-muted-foreground">{s.screens?.theaters?.name} · {s.screens?.name}</td>
                <td className="p-4 text-muted-foreground">{formatShowDateOnly(s.start_time)} · {formatShowTimeOnly(s.start_time)}</td>
                <td className="p-4">{inr(Number(s.base_price))}</td>
                <td className="p-4 text-right"><Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="size-4 text-destructive" /></Button></td>
              </tr>
            ))}
            {shows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No shows yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
