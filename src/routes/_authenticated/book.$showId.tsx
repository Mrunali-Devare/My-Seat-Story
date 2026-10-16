import { createFileRoute, useRouter, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, MapPin, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SeatGrid, type SeatRow } from "@/components/seats/SeatGrid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatShowDateOnly, formatShowTimeOnly, inr } from "@/lib/format";
import { toast } from "sonner";

const LOCK_MINUTES = 5;

export const Route = createFileRoute("/_authenticated/book/$showId")({
  component: BookPage,
});

function BookPage() {
  const { showId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [lockExpiry, setLockExpiry] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: show } = useQuery({
    queryKey: ["show", showId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select("id, start_time, base_price, screens(name, theaters(name,city,address)), movies(title, poster_url, duration_minutes, certificate, languages)")
        .eq("id", showId).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: seats = [], refetch } = useQuery({
    queryKey: ["seats", showId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("show_seats")
        .select("id, show_id, row_label, col_num, seat_label, seat_type, price, status, locked_by, locked_until")
        .eq("show_id", showId);
      if (error) throw error;
      return (data ?? []) as SeatRow[];
    },
    refetchInterval: 8000,
  });

  // Realtime updates
  useEffect(() => {
    const ch = supabase.channel(`seats:${showId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "show_seats", filter: `show_id=eq.${showId}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [showId, refetch]);

  // Release locks on unmount
  useEffect(() => {
    return () => {
      const ids = Array.from(selected);
      if (ids.length && user) {
        supabase.from("show_seats").update({ status: "available", locked_by: null, locked_until: null })
          .in("id", ids).eq("locked_by", user.id).then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => {
    let t = 0;
    for (const s of seats) if (selected.has(s.id)) t += Number(s.price);
    return t;
  }, [seats, selected]);

  const selectedSeats = seats.filter((s) => selected.has(s.id));

  const toggleSeat = async (seat: SeatRow) => {
  if (!user) return;

  if (selected.has(seat.id)) {
    // Unlock the seat
    const { data, error } = await supabase
      .from("show_seats")
      .update({
        status: "available",
        locked_by: null,
        locked_until: null,
      })
      .eq("id", seat.id)
      .eq("locked_by", user.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("UNLOCK SEAT ERROR:", error);
      return toast.error(`Could not release seat: ${error.message}`);
    }

    if (!data) {
      console.error("UNLOCK SEAT: no matching row", {
        seatId: seat.id,
        userId: user.id,
      });
      return toast.error("Could not release seat");
    }

    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(seat.id);
      return next;
    });
  } else {
    if (selected.size >= 10) {
      return toast.error("Max 10 seats per booking");
    }

    const until = new Date(
      Date.now() + LOCK_MINUTES * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase
      .from("show_seats")
      .update({
        status: "locked",
        locked_by: user.id,
        locked_until: until,
      })
      .eq("id", seat.id)
      .eq("status", "available")
      .is("locked_by", null)
      .select()
      .maybeSingle();

    if (error) {
      console.error("LOCK SEAT ERROR:", error);

      return toast.error(
        `Could not select seat: ${error.message}`,
      );
    }

    if (!data) {
      console.error("LOCK SEAT: no matching available seat", {
        seatId: seat.id,
        userId: user.id,
      });

      return toast.error("Seat is no longer available");
    }

    setSelected((prev) => {
      const next = new Set(prev);
      next.add(seat.id);
      return next;
    });

    setLockExpiry(
      Date.now() + LOCK_MINUTES * 60 * 1000,
    );
  }

  qc.invalidateQueries({
    queryKey: ["seats", showId],
  });
};

  // Auto-release on timer
  useEffect(() => {
    if (!lockExpiry || !selected.size) return;
    if (now > lockExpiry) {
      const ids = Array.from(selected);
      if (user) {
        supabase.from("show_seats").update({ status: "available", locked_by: null, locked_until: null })
          .in("id", ids).eq("locked_by", user.id).then(() => {});
      }
      setSelected(new Set());
      setLockExpiry(null);
      toast.error("Your seat hold expired. Please reselect.");
    }
  }, [now, lockExpiry, selected, user]);

  const handlePay = async () => {
    if (!user || selected.size === 0) return;
    setPaying(true);
    try {
      // Simulate payment delay
      await new Promise((r) => setTimeout(r, 1400));
      // Always succeed in mock mode
      const { data: booking, error } = await supabase.from("bookings").insert({
        user_id: user.id,
        show_id: showId,
        total_amount: total,
        status: "confirmed",
        payment_status: "success",
      }).select().single();
      if (error || !booking) throw error;

      const seatIds = Array.from(selected);
      const seatRows = seats.filter((s) => seatIds.includes(s.id));
      await supabase.from("booking_seats").insert(
        seatRows.map((s) => ({ booking_id: booking.id, show_seat_id: s.id, seat_label: s.seat_label, price: s.price }))
      );
      await supabase.from("show_seats").update({
        status: "booked", booking_id: booking.id, locked_by: null, locked_until: null,
      }).in("id", seatIds);

      toast.success("Booking confirmed!");
      router.navigate({ to: "/tickets/$bookingId", params: { bookingId: booking.id } });
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setPaying(false);
      setShowPay(false);
    }
  };

  const movie = (show as any)?.movies;
  const theater = (show as any)?.screens?.theaters;

  const lockRemainingMs = lockExpiry ? Math.max(0, lockExpiry - now) : 0;
  const mm = Math.floor(lockRemainingMs / 60000);
  const ss = Math.floor((lockRemainingMs % 60000) / 1000).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-background pb-32">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6">
        <Link to="/movies/$id" params={{ id: (show as any)?.movies?.id || "" }} onClick={(e) => { e.preventDefault(); router.history.back(); }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </Link>

        {show && movie && theater && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            {movie.poster_url && <img src={movie.poster_url} alt={movie.title} className="h-20 w-14 rounded-md object-cover" />}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{movie.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {theater.name}, {theater.city}</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {formatShowDateOnly(show.start_time)} · {formatShowTimeOnly(show.start_time)}</span>
                <span className="opacity-70">({(show as any).screens?.name})</span>
              </p>
            </div>
            {lockExpiry && lockRemainingMs > 0 && (
              <div className="rounded-lg border border-[color:var(--color-gold)]/40 bg-[color:var(--color-gold)]/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--color-gold)]">
                Hold expires in {mm}:{ss}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <SeatGrid seats={seats} selected={selected} currentUserId={user?.id ?? null} onToggle={toggleSeat} />
        </div>
      </div>

      {/* Bottom checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{selected.size} seat{selected.size === 1 ? "" : "s"} selected</p>
            <p className="text-lg font-bold">{inr(total)}</p>
            {selectedSeats.length > 0 && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{selectedSeats.map((s) => s.seat_label).join(", ")}</p>
            )}
          </div>
          <Button
            disabled={selected.size === 0 || paying}
            onClick={() => setShowPay(true)}
            size="lg"
            className="bg-gradient-to-r from-primary to-primary-glow shadow-glow"
          >
            <CreditCard className="mr-2 size-4" /> Pay {inr(total)}
          </Button>
        </div>
      </div>

      <Dialog open={showPay} onOpenChange={setShowPay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mock payment</DialogTitle>
            <DialogDescription>This is a demo Razorpay simulation — no real charge will occur.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span>{selectedSeats.map((s) => s.seat_label).join(", ")}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(total)}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Convenience fee</span><span>{inr(0)}</span></div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold"><span>Total</span><span>{inr(total)}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPay(false)} disabled={paying}>Cancel</Button>
            <Button onClick={handlePay} disabled={paying} className="bg-gradient-to-r from-primary to-primary-glow shadow-glow">
              {paying ? <><Loader2 className="mr-2 size-4 animate-spin" />Processing…</> : <>Pay {inr(total)}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
