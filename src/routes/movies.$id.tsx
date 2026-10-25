import { AprioriRecommendations } from "@/components/movies/AprioriRecommendations";
import { ClusterRecommendations } from "@/components/movies/ClusterRecommendations";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, Clock, Calendar, Languages, MapPin, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatShowTimeOnly, formatShowDateOnly, inr } from "@/lib/format";
import { MovieReviews } from "@/components/movies/MovieReviews";
import { Poster, Backdrop } from "@/components/ui/poster";

export const Route = createFileRoute("/movies/$id")({
  component: MoviePage,
  head: ({ params }) => ({
    meta: [
      { title: `Movie · My Seat Story` },
      { name: "description", content: `Book tickets for movie ${params.id} on My Seat Story.` },
    ],
  }),
});

function MoviePage() {
  const { id } = Route.useParams();
  const [city, setCity] = useState(() => {
  if (typeof window === "undefined") return "Mumbai";
  return localStorage.getItem("city") || "Mumbai";
});

useEffect(() => {
  const savedCity = localStorage.getItem("city") || "Mumbai";
  setCity(savedCity);

  const handleCityChange = (event: Event) => {
    const customEvent = event as CustomEvent<string>;
    setCity(customEvent.detail);
  };

  window.addEventListener("cityChanged", handleCityChange);

  return () => {
    window.removeEventListener("cityChanged", handleCityChange);
  };
}, []);

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("movies").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });
  const { data: shows = [], isLoading: isLoadingShows } = useQuery({
  queryKey: ["movie-shows", id, city],
  enabled: !!movie && !!city,
  queryFn: async () => {
    // 1. Find theatres in the selected city
    const { data: theatres, error: theatreError } = await supabase
      .from("theaters")
      .select("id,name,city,address")
      .eq("city", city);

    if (theatreError) throw theatreError;

    const theatreIds = (theatres ?? []).map((theatre) => theatre.id);

    if (theatreIds.length === 0) {
      return [];
    }

    // 2. Find screens belonging to those theatres
    const { data: screens, error: screenError } = await supabase
      .from("screens")
      .select("id,name,theater_id")
      .in("theater_id", theatreIds);

    if (screenError) throw screenError;

    const screenIds = (screens ?? []).map((screen) => screen.id);

    if (screenIds.length === 0) {
      return [];
    }

    // 3. Find this movie's future shows on those screens
    const { data: showData, error: showError } = await supabase
      .from("shows")
      .select("id,start_time,base_price,screen_id")
      .eq("movie_id", id)
      .in("screen_id", screenIds)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (showError) throw showError;

    // 4. Create lookup maps
    const screenMap = new Map(
      (screens ?? []).map((screen) => [screen.id, screen])
    );

    const theatreMap = new Map(
      (theatres ?? []).map((theatre) => [theatre.id, theatre])
    );

    // 5. Attach theatre + screen information
    return (showData ?? []).map((show) => {
      const screen = screenMap.get(show.screen_id);

      const theatre = screen
        ? theatreMap.get(screen.theater_id)
        : undefined;

      return {
        ...show,
        screen,
        theatre,
      };
    });
  },
});

  // Group shows by theater + date
  const grouped = new Map<
  string,
  {
    theater: any;
    dates: Map<string, typeof shows>;
  }
>();

for (const s of shows) {
  const theater = (s as any).theatre;

  if (!theater) continue;

  const tid = theater.id as string;

  if (!grouped.has(tid)) {
    grouped.set(tid, {
      theater,
      dates: new Map(),
    });
  }

  const dateKey = new Date(s.start_time).toDateString();

  const entry = grouped.get(tid)!;

  if (!entry.dates.has(dateKey)) {
    entry.dates.set(dateKey, []);
  }

  entry.dates.get(dateKey)!.push(s);
}

  if (isLoading) return (
    <div className="min-h-screen bg-background"><SiteHeader /><div className="container mx-auto px-4 py-20 text-muted-foreground">Loading…</div></div>
  );
  if (!movie) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Banner */}
      <section className="relative isolate overflow-hidden">
        {(movie.backdrop_url || movie.poster_url) && (
          <div className="absolute inset-0 -z-10">
            <Backdrop src={movie.backdrop_url ?? movie.poster_url} className="size-full object-cover opacity-30 blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
          </div>
        )}
        <div className="container mx-auto px-4 py-10 sm:py-16">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to movies
          </Link>
          <div className="mt-6 grid gap-8 md:grid-cols-[260px_1fr]">
            <div className="aspect-[2/3] w-full max-w-[260px] overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border/40">
              <Poster src={movie.poster_url} title={movie.title} />
            </div>
            <div>
              <h1 className="text-4xl font-bold sm:text-5xl">{movie.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Star className="size-4 fill-[color:var(--color-gold)] text-[color:var(--color-gold)]" />
                  <span className="font-semibold">{(movie.rating ?? 0).toFixed(1)}</span>/10
                </span>
                <span className="inline-flex items-center gap-1"><Clock className="size-4" /> {movie.duration_minutes}m</span>
                <span className="inline-flex items-center gap-1"><Languages className="size-4" /> {movie.languages.join(", ")}</span>
                {movie.release_date && (
                  <span className="inline-flex items-center gap-1"><Calendar className="size-4" /> {new Date(movie.release_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                )}
                {movie.certificate && <Badge variant="outline">{movie.certificate}</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {movie.genres.map((g: string) => (
                  <Badge key={g} className="bg-primary/15 text-primary-glow hover:bg-primary/20">{g}</Badge>
                ))}
              </div>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground">{movie.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Showtimes */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold">
  Showtimes in {city}
</h2>

<p className="mt-1 text-sm text-muted-foreground">
  Pick a theatre and showtime to continue.
</p>
        {isLoadingShows ? (
  <div className="mt-8 rounded-2xl border border-border bg-card/40 p-10 text-center text-muted-foreground">
    Loading showtimes in {city}…
  </div>
) : shows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
            No upcoming shows scheduled yet. Check back soon.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {[...grouped.values()].map(({ theater, dates }) => (
              <div key={theater.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{theater.name}</h3>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {theater.address}, {theater.city}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  {[...dates.entries()].map(([dateKey, slots]) => (
                    <div key={dateKey}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {formatShowDateOnly(slots[0].start_time)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => (
                          <Button key={s.id} asChild variant="outline" className="border-primary/40 bg-primary/5 text-foreground hover:bg-primary/15">
                            <Link to="/book/$showId" params={{ showId: s.id }}>
                              <span className="font-semibold">{formatShowTimeOnly(s.start_time)}</span>
                              <span className="ml-2 text-xs text-muted-foreground">from {inr(Number(s.base_price))}</span>
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
            </section>

      <MovieReviews movieId={movie.id} />

<ClusterRecommendations movieId={movie.id} />

<AprioriRecommendations movieTitle={movie.title} />
    </div>
  );
}
