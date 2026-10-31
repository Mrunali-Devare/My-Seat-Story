import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

/** Deterministic hue from the title so each missing poster gets its own tint. */
function hueFor(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

type PosterProps = {
  src: string | null | undefined;
  title: string;
  className?: string;
  imgClassName?: string;
  /** compact hides the title text (for small thumbnails) */
  compact?: boolean;
  loading?: "lazy" | "eager";
};

/** Poster image that falls back to a designed placeholder when the URL is missing or broken. */
export function Poster({ src, title, className, imgClassName, compact = false, loading = "lazy" }: PosterProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    const hue = hueFor(title);
    return (
      <div
        role="img"
        aria-label={`${title} (poster unavailable)`}
        className={cn("relative flex size-full flex-col items-center justify-center gap-2 overflow-hidden p-3 text-center", className)}
        style={{
          background: `radial-gradient(120% 90% at 20% 0%, oklch(0.34 0.05 ${hue}) 0%, oklch(0.2 0.02 ${hue}) 70%)`,
        }}
      >
        <Clapperboard className="size-1/4 min-w-4 max-w-10 text-white/35" strokeWidth={1.5} />
        {!compact && (
          <span className="line-clamp-3 font-display text-sm font-semibold leading-tight text-white/70">{title}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title} poster`}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("size-full object-cover", imgClassName, className)}
    />
  );
}

/** Wide backdrop that simply disappears (no broken-image icon) if it fails to load. */
export function Backdrop({ src, className }: { src: string | null | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return null;
  return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} />;
}
