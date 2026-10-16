import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/premium/GlassPanel";
import { PremiumCard } from "@/components/premium/PremiumCard";

export type SeatRow = {
  id: string;
  show_id: string;
  row_label: string;
  col_num: number;
  seat_label: string;
  seat_type: "regular" | "premium" | "vip" | "recliner";
  price: number;
  status: "available" | "locked" | "booked";
  locked_by: string | null;
  locked_until: string | null;
};

const TYPE_CONFIG: Record<SeatRow["seat_type"], { color: string; label: string; border: string }> = {
  regular: { 
    color: "bg-[color:var(--color-seat-available)]", 
    label: "Regular",
    border: "border-white/20"
  },
  premium: { 
    color: "bg-[color:var(--color-seat-premium)]", 
    label: "Premium",
    border: "border-[color:var(--color-gold)]/50"
  },
  vip: { 
    color: "bg-[color:var(--color-seat-vip)]", 
    label: "VIP",
    border: "border-[color:var(--color-primary)]/50"
  },
  recliner: { 
    color: "bg-[color:var(--color-seat-recliner)]", 
    label: "Recliner",
    border: "border-[color:var(--color-primary-glow)]/50"
  },
};

export function SeatGrid({
  seats, selected, currentUserId, onToggle,
}: {
  seats: SeatRow[];
  selected: Set<string>;
  currentUserId: string | null;
  onToggle: (seat: SeatRow) => void;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, SeatRow[]>();
    for (const s of seats) {
      if (!map.has(s.row_label)) map.set(s.row_label, []);
      map.get(s.row_label)!.push(s);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.col_num - b.col_num);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  return (
    <div className="space-y-8">
      {/* Screen indicator */}
      <div className="relative">
        <div className="mx-auto h-2 max-w-lg rounded-full bg-gradient-to-r from-transparent via-[color:var(--color-gold)] to-transparent shadow-glow" />
        <div className="absolute inset-x-0 top-4 flex justify-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold)]">Screen</span>
        </div>
      </div>

      {/* Seat grid */}
      <GlassPanel className="p-6 md:p-8">
        <div className="space-y-3">
          {rows.map(([row, arr]) => (
            <div key={row} className="flex items-center justify-center gap-2">
              <span className="w-6 text-xs font-semibold text-white/50">{row}</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {arr.map((seat, i) => {
                  const sel = selected.has(seat.id);
                  const isBooked = seat.status === "booked";
                  const isMine = seat.status === "locked" && seat.locked_by === currentUserId;
                  const isOtherLock = seat.status === "locked" && !isMine;
                  const gap = arr.length > 6 && i === Math.floor(arr.length / 2) ? "ml-6" : "";
                  const config = TYPE_CONFIG[seat.seat_type];

                  return (
                    <button
                      key={seat.id}
                      disabled={isBooked || isOtherLock}
                      onClick={() => onToggle(seat)}
                      title={`${seat.seat_label} · ${config.label} · ₹${seat.price}`}
                      className={cn(
                        "relative size-8 md:size-10 rounded-lg border text-[10px] md:text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed",
                        gap,
                        isBooked && "border-transparent bg-white/5 text-white/20",
                        isOtherLock && "border-[color:var(--color-seat-locked)] bg-[color:var(--color-seat-locked)]/20 text-white/40",
                        !isBooked && !isOtherLock && !sel && cn(
                          config.color,
                          config.border,
                          "hover:scale-110 hover:shadow-glow hover:brightness-110"
                        ),
                        sel && "bg-[color:var(--color-seat-selected)] border-[color:var(--color-gold)] text-[color:var(--color-gold-foreground)] shadow-glow scale-110",
                      )}
                    >
                      {seat.col_num}
                      {sel && (
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="w-6 text-xs font-semibold text-white/50">{row}</span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Legend */}
      <PremiumCard variant="glass" className="p-4">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-white/70">
          <LegendItem color="bg-[color:var(--color-seat-available)] border-white/20" label="Available" />
          <LegendItem color="bg-[color:var(--color-seat-selected)] border-[color:var(--color-gold)]" label="Selected" />
          <LegendItem color="bg-white/5 border-transparent" label="Booked" />
          <LegendItem color="bg-[color:var(--color-seat-locked)]/20 border-[color:var(--color-seat-locked)]" label="On hold" />
          <LegendItem color="bg-[color:var(--color-seat-premium)] border-[color:var(--color-gold)]/50" label="Premium" />
          <LegendItem color="bg-[color:var(--color-seat-vip)] border-[color:var(--color-primary)]/50" label="VIP" />
        </div>
      </PremiumCard>
    </div>
  );
}

function LegendItem({ color, label, border = "border-transparent" }: { color: string; label: string; border?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("size-5 rounded-md border", color, border)} />
      <span>{label}</span>
    </div>
  );
}
