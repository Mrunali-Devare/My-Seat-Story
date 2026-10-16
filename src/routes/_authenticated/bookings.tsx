import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Ticket, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { formatShowDateOnly, formatShowTimeOnly, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, total_amount, status, payment_status, created_at, shows(start_time, screens(name, theaters(name,city)), movies(title, poster_url)), booking_seats(seat_label)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your tickets, history and receipts.</p>

        {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
        {!isLoading && bookings.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <Ticket className="mx-auto size-8 text-primary-glow" />
            <p className="mt-3 font-semibold">No bookings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse movies and book your first ticket.</p>
            <Link to="/" className="mt-4 inline-flex rounded-md bg-gradient-to-r from-primary to-primary-glow px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">Browse movies</Link>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {bookings.map((b: any) => {
            const movie = b.shows?.movies;
            const theater = b.shows?.screens?.theaters;
            return (
              <Link key={b.id} to="/tickets/$bookingId" params={{ bookingId: b.id }}
                    className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-card transition hover:border-primary/40">
                {movie?.poster_url && <img src={movie.poster_url} alt={movie.title} className="h-20 w-14 shrink-0 rounded-md object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold">{movie?.title}</h3>
                    <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "outline"} className="shrink-0 capitalize">{b.status}</Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {theater?.name}, {theater?.city}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="size-3" /> {formatShowDateOnly(b.shows?.start_time)} · {formatShowTimeOnly(b.shows?.start_time)}</span>
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {b.booking_seats.map((s: any) => s.seat_label).join(", ")} · <span className="font-semibold text-foreground">{inr(Number(b.total_amount))}</span>
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
