
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
  seat_type: "regular" | "vip";
  price: number;
  status: "available" | "locked" | "booked";
  locked_by: string | null;
  locked_until: string | null;
};
const TYPE_CONFIG: Record<
  SeatRow["seat_type"],
  { background: string; label: string; border: string }
> = {
  regular: {
    background: "#2563eb",
    label: "Regular",
    border: "#93c5fd",
  },
  vip: {
    background: "#dc2626",
    label: "VIP",
    border: "#fca5a5",
  },
};
const STATUS_CONFIG = {
  available: "bg-seat-available border-white/30 text-white",
  selected:
    "bg-seat-selected border-yellow-200 text-gray-950 shadow-glow scale-110",
  booked: "bg-seat-booked border-gray-500/50 text-white/70",
  locked: "bg-seat-locked border-orange-300/70 text-white",
};

export function SeatGrid({
  seats,
  selected,
  currentUserId,
  onToggle,
}: {
  seats: SeatRow[];
  selected: Set<string>;
  currentUserId: string | null;
  onToggle: (seat: SeatRow) => void;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, SeatRow[]>();

    for (const seat of seats) {
      if (!map.has(seat.row_label)) {
        map.set(seat.row_label, []);
      }

      map.get(seat.row_label)!.push(seat);
    }

    for (const arr of map.values()) {
      arr.sort((a, b) => a.col_num - b.col_num);
    }

    return [...map.entries()].sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [seats]);

  return (
    <div className="space-y-8">
      {/* Screen indicator */}
      <div className="relative pb-5">
        <div className="mx-auto h-2 max-w-lg rounded-full bg-gradient-to-r from-transparent via-[color:var(--color-gold)] to-transparent shadow-glow" />
        <div className="absolute inset-x-0 top-4 flex justify-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold)]">
            Screen
          </span>
        </div>
      </div>

      {/* Seat grid */}
      <GlassPanel className="p-6 md:p-8">
        <div className="space-y-3">
          {rows.map(([row, arr]) => (
            <div
              key={row}
              className="flex items-center justify-center gap-2"
            >
              <span className="w-6 text-xs font-semibold text-white/60">
                {row}
              </span>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {arr.map((seat, i) => {
                  const isSelected = selected.has(seat.id);
const isBooked = seat.status === "booked";
const isMine =
  seat.status === "locked" &&
  seat.locked_by === currentUserId;
const isOtherLock =
  seat.status === "locked" && !isMine;


const config = TYPE_CONFIG[seat.seat_type];
console.log(
  "Seat:",
  seat.seat_label,
  "| Type:",
  seat.seat_type,
  "| Status:",
  seat.status
);


const backgroundColor = isBooked
  ? "#000000"
  : isOtherLock
    ? "#f97316"
    : isSelected
      ? "#facc15"
      : seat.seat_type === "vip"
        ? "#dc2626"
        : "#2563eb";

const borderColor = isBooked
  ? "#525252"
  : isOtherLock
    ? "#fdba74"
    : isSelected
      ? "#fef08a"
      : seat.seat_type === "vip"
        ? "#fca5a5"
        : "#93c5fd";

const gap =
  arr.length > 6 && i === Math.floor(arr.length / 2)
    ? "ml-6"
    : "";


return (
  <button
    key={seat.id}
    type="button"
    disabled={isBooked || isOtherLock}
    aria-pressed={isSelected}
    onClick={() => onToggle(seat)}
    title={`${seat.seat_label} · ${config.label} · ₹${seat.price} · ${seat.status}`}
    style={{
      backgroundColor,
      borderColor,
      color: isSelected ? "#171717" : "#ffffff",
      opacity: isBooked ? 0.85 : 1,
    }}
    className={cn(
      "relative flex size-8 md:size-10 items-center justify-center rounded-lg border text-[10px] md:text-xs font-semibold transition-all duration-200",
      gap,
      isSelected && "scale-110 shadow-glow",
      !isBooked &&
        !isOtherLock &&
        "cursor-pointer hover:brightness-125 hover:scale-110",
      (isBooked || isOtherLock) && "cursor-not-allowed"
    )}
  >
    {seat.col_num}
  </button>
);
                })}
              </div>

              <span className="w-6 text-xs font-semibold text-white/60">
                {row}
              </span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Legend */}
      <PremiumCard variant="glass" className="p-4">
        
<div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-white/80">
  <LegendItem color="bg-blue-600 border-blue-300" label="Available" />
  <LegendItem color="bg-yellow-400 border-yellow-200" label="Selected" />
  <LegendItem color="bg-black border-gray-500" label="Booked" />
  <LegendItem color="bg-orange-500 border-orange-300" label="On hold" />
  <LegendItem color="bg-red-600 border-red-300" label="VIP" />
</div>
      </PremiumCard>
    </div>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("size-5 rounded-md border", color)} />
      <span>{label}</span>
    </div>
  );
}
