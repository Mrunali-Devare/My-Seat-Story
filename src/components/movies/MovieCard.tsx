import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Poster } from "@/components/ui/poster";

export type MovieCardData = {
  id: string;
  title: string;
  poster_url: string | null;
  rating: number | null;
  genres: string[];
  duration_minutes: number;
  certificate: string | null;
  languages: string[];
};

export function MovieCard({ movie, fluid = false }: { movie: MovieCardData; fluid?: boolean }) {
  return (
    <Link
      to="/movies/$id"
      params={{ id: movie.id }}
      className={cn(
        "group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--color-background)]",
        fluid ? "w-full" : "w-[180px] shrink-0 sm:w-[200px] md:w-[220px]",
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-[color:var(--color-card)] ring-1 ring-inset ring-white/10 transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-glow group-active:scale-[0.99]">
        <Poster
          src={movie.poster_url}
          title={movie.title}
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 text-sm font-semibold text-white">
          <Star className="size-3.5 fill-[color:var(--color-primary)] text-[color:var(--color-primary)]" />
          {(movie.rating ?? 0).toFixed(1)}
        </span>

        {movie.certificate && (
          <span className="absolute right-2.5 top-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
            {movie.certificate}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 px-0.5">
        <h3 className="line-clamp-1 font-display text-base font-semibold leading-snug text-white transition-colors group-hover:text-[color:var(--color-primary)]">
          {movie.title}
        </h3>
        <p className="line-clamp-1 text-xs text-white/55">
          {movie.genres.slice(0, 2).join(" · ")} · {movie.duration_minutes} min · {movie.languages[0] ?? "English"}
        </p>
      </div>
    </Link>
  );
}
