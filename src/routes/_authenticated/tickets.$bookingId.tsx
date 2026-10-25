import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Download, Film, MapPin, Calendar, Clock, Ticket as TicketIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { formatShowDateOnly, formatShowTimeOnly, inr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tickets/$bookingId")({
  component: TicketPage,
});

function TicketPage() {
  const { bookingId } = Route.useParams();
  const [qr, setQr] = useState<string>("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, total_amount, status, payment_status, created_at, shows(start_time, screens(name, theaters(name,city,address)), movies(title, poster_url, duration_minutes, certificate)), booking_seats(seat_label, price)")
        .eq("id", bookingId).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  useEffect(() => {
    if (!booking) return;
    QRCode.toDataURL(`My Seat Story:${booking.booking_code}`, { width: 320, margin: 1, color: { dark: "#1a1140", light: "#ffffff" } })
      .then(setQr).catch(() => {});
  }, [booking]);

  
const cancel = async () => {
  if (!booking) return;

  if (!confirm("Cancel this booking? Its seats will be released.")) {
    return;
  }

  const { data, error } = await supabase.rpc("cancel_mock_booking", {
    p_booking_id: booking.id,
  });

  if (error) {
    return toast.error(error.message);
  }

  if (!data) {
    return toast.error("The booking could not be cancelled.");
  }

  toast.success("Booking cancelled. No real payment or refund was processed.");
  location.reload();
};

  const download = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `ticket-${booking?.booking_code}.png`;
    a.click();
  };

  if (isLoading || !booking) return (
    <div className="min-h-screen bg-background"><SiteHeader /><div className="container mx-auto px-4 py-20 text-muted-foreground">Loading ticket…</div></div>
  );

  const movie = (booking as any).shows?.movies;
  const theater = (booking as any).shows?.screens?.theaters;
  const screen = (booking as any).shows?.screens?.name;
  const startTime = (booking as any).shows?.start_time;
  const cancelled = booking.status === "cancelled";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <Link to="/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All bookings
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
          {/* Banner */}
          <div className="relative isolate bg-gradient-to-br from-primary/40 via-primary/20 to-background p-6">
            {!cancelled ? (
              <div className="flex items-center gap-2 text-[color:var(--color-success)]">
                <CheckCircle2 className="size-5" />
                <p className="text-sm font-semibold">Booking confirmed</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <p className="text-sm font-semibold">Cancelled & refunded</p>
              </div>
            )}
            <h1 className="mt-4 flex items-center gap-3 text-2xl font-bold sm:text-3xl">
              <Film className="size-6 text-primary-glow" /> {movie?.title}
            </h1>
            <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="size-4" /> {theater?.name} · {screen}</p>
              <p className="flex items-center gap-2"><Calendar className="size-4" /> {formatShowDateOnly(startTime)}</p>
              <p className="flex items-center gap-2"><Clock className="size-4" /> {formatShowTimeOnly(startTime)}</p>
            </div>
          </div>

          {/* Perforation */}
          <div className="relative h-6 bg-card">
            <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-border" />
            <div className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" />
            <div className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" />
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Booking ID</p>
                <p className="font-mono text-lg font-semibold tracking-wider">{booking.booking_code}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Seats</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(booking as any).booking_seats.map((s: any) => (
                    <span key={s.seat_label} className="rounded-md bg-primary/15 px-2 py-1 text-sm font-semibold text-primary-glow">{s.seat_label}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount paid</p>
                <p className="text-lg font-bold">{inr(Number(booking.total_amount))}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              {qr && <img src={qr} alt="QR" className="size-40 rounded-lg bg-white p-2" />}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Scan at entry</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/20 p-4">
            <Button variant="outline" onClick={download}><Download className="mr-2 size-4" /> Download QR</Button>
            {!cancelled && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={cancel}>Cancel booking</Button>
            )}
            <Button asChild className="bg-gradient-to-r from-primary to-primary-glow shadow-glow">
              <Link to="/"><TicketIcon className="mr-2 size-4" /> Book another</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
