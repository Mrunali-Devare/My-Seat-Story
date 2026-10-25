import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { TrendingUp, CalendarClock, MapPin, Sparkles, Film, ArrowLeft, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MovieCard } from "@/components/movies/MovieCard";
import { HeroBanner } from "@/components/premium/HeroBanner";
import { GlassPanel } from "@/components/premium/GlassPanel";
import { PremiumCard } from "@/components/premium/PremiumCard";
import type { MovieCardData } from "@/components/movies/MovieCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const searchSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  genre: z.string().optional(),
  language: z.string().optional(),
  minRating: z.string().optional(),
  minDuration: z.string().optional(),
  maxDuration: z.string().optional(),
  certificate: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
});

type HomeSearch = z.infer<typeof searchSchema>;
type Movie = MovieCardData & {
  description: string | null;
  backdrop_url: string | null;
  featured: boolean;
  trending: boolean;
  status: string;
  release_date?: string | null;
};
type HeroMovie = MovieCardData & { description: string | null; backdrop_url: string | null };

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Cineverse — Book movie tickets online" },
      { name: "description", content: "Browse trending films, pick your seats, and book movie tickets in seconds." },
      { property: "og:title", content: "Cineverse — Book movie tickets online" },
      { property: "og:description", content: "Browse trending films, pick your seats, and book movie tickets in seconds." },
    ],
  }),
  component: Home,
});

function Home() {
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const [city, setCity] = useState(() => {
    if (typeof window === "undefined") return "Mumbai";
    return localStorage.getItem("city") || "Mumbai";
  });

  useEffect(() => {
    if (routeSearch.city) {
      setCity(routeSearch.city);
      localStorage.setItem("city", routeSearch.city);
    } else if (typeof window !== "undefined") {
      const savedCity = localStorage.getItem("city") || "Mumbai";
      setCity(savedCity);
      void navigate({
        to: "/",
        search: (previous) => ({ ...previous, city: savedCity }),
      });
    }
  }, [routeSearch.city, navigate]);

  useEffect(() => {
    const handleCityChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setCity(customEvent.detail);
    };
    window.addEventListener("cityChanged", handleCityChange);
    return () => window.removeEventListener("cityChanged", handleCityChange);
  }, []);

  const searchQuery = (routeSearch.search ?? "").trim().toLowerCase();
  const selectedGenre = routeSearch.genre ?? "All";
  const selectedLanguage = routeSearch.language ?? "All";
  const minimumRating = routeSearch.minRating ?? "0";
  const minimumDuration = routeSearch.minDuration ?? "0";
  const maximumDuration = routeSearch.maxDuration ?? "Any";
  const selectedCertificate = routeSearch.certificate ?? "All";
  const selectedStatus = routeSearch.status ?? "all";
  const sortBy = routeSearch.sort ?? "rating_desc";

  const updateSearchParam = (key: keyof HomeSearch, value: string) => {
    void navigate({
      to: "/",
      search: (previous) => ({
        ...previous,
        [key]: value === "" || value === "All" || value === "all" || (key === "minRating" && value === "0") || (key === "minDuration" && value === "0") || (key === "maxDuration" && value === "Any") || (key === "sort" && value === "rating_desc") ? undefined : value,
      }),
    });
  };

  const resetFilters = () => {
    void navigate({
      to: "/",
      search: (previous) => ({ search: previous.search, city: previous.city }),
    });
  };

const {
  data: movies = [],
  isLoading,
  isError,
  error: moviesError,
} = useQuery({
  queryKey: ["movies", "city", city],
  enabled: !!city,
  placeholderData: keepPreviousData,
  queryFn: async () => {
    // 1. Get theatres in the selected city
    const { data: theatres, error: theatreError } = await supabase
      .from("theaters")
      .select("id")
      .eq("city", city);

    if (theatreError) throw theatreError;

    const theatreIds = (theatres ?? []).map((theatre) => theatre.id);

    if (theatreIds.length === 0) {
      return [] as Movie[];
    }

    // 2. Get screens belonging to those theatres
    const { data: screens, error: screenError } = await supabase
      .from("screens")
      .select("id")
      .in("theater_id", theatreIds);

    if (screenError) throw screenError;

    const screenIds = (screens ?? []).map((screen) => screen.id);

    if (screenIds.length === 0) {
      return [] as Movie[];
    }

    // 3. Get shows running on those screens
    const { data: shows, error: showError } = await supabase
      .from("shows")
      .select("movie_id")
      .in("screen_id", screenIds);

    if (showError) throw showError;

    const movieIds = Array.from(
      new Set((shows ?? []).map((show) => show.movie_id))
    );
    if (movieIds.length === 0) {
      return [] as Movie[];
    }

    // 4. Get only movies that have shows in the selected city
    const { data: cityMovies, error: movieError } = await supabase
      .from("movies")
      .select(
        "id,title,description,poster_url,backdrop_url,rating,genres,duration_minutes,certificate,languages,featured,trending,status,release_date"
      )
      .in("id", movieIds)
      .order("rating", { ascending: false });

    if (movieError) throw movieError;

    return (cityMovies ?? []) as Movie[];
  },
});
  const genres = useMemo(() => Array.from(new Set(movies.flatMap((movie) => movie.genres ?? []))).sort(), [movies]);
  const languages = useMemo(() => Array.from(new Set(movies.flatMap((movie) => movie.languages ?? []))).sort(), [movies]);
  const certificates = useMemo(() => Array.from(new Set(movies.map((movie) => movie.certificate).filter((value): value is string => Boolean(value)))).sort(), [movies]);

  const filteredMovies = useMemo(() => {
    const filtered = movies.filter((movie) => {
      const title = movie.title?.toLowerCase() ?? "";
      const movieGenres = (movie.genres ?? []).join(" ").toLowerCase();
      const movieLanguages = (movie.languages ?? []).join(" ").toLowerCase();
      const certificate = (movie.certificate ?? "").toLowerCase();
      const matchesSearch = !searchQuery || title.includes(searchQuery) || movieGenres.includes(searchQuery) || movieLanguages.includes(searchQuery) || certificate.includes(searchQuery);
      const matchesGenre = selectedGenre === "All" || (movie.genres ?? []).includes(selectedGenre);
      const matchesLanguage = selectedLanguage === "All" || (movie.languages ?? []).includes(selectedLanguage);
      const matchesRating = Number(movie.rating ?? 0) >= Number(minimumRating);
      const duration = Number(movie.duration_minutes ?? 0);
      const matchesMinDuration = duration >= Number(minimumDuration);
      const matchesMaxDuration = maximumDuration === "Any" || duration <= Number(maximumDuration);
      const matchesCertificate = selectedCertificate === "All" || movie.certificate === selectedCertificate;
      const matchesStatus = selectedStatus === "all" || movie.status === selectedStatus;
      return matchesSearch && matchesGenre && matchesLanguage && matchesRating && matchesMinDuration && matchesMaxDuration && matchesCertificate && matchesStatus;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "rating_asc") return Number(a.rating ?? 0) - Number(b.rating ?? 0);
      if (sortBy === "title_asc") return a.title.localeCompare(b.title);
      if (sortBy === "title_desc") return b.title.localeCompare(a.title);
      if (sortBy === "duration_asc") return Number(a.duration_minutes ?? 0) - Number(b.duration_minutes ?? 0);
      if (sortBy === "duration_desc") return Number(b.duration_minutes ?? 0) - Number(a.duration_minutes ?? 0);
      if (sortBy === "release_desc") return (b.release_date ?? "").localeCompare(a.release_date ?? "");
      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    });
  }, [movies, searchQuery, selectedGenre, selectedLanguage, minimumRating, minimumDuration, maximumDuration, selectedCertificate, selectedStatus, sortBy]);

  const cityFilteredMovies = filteredMovies;

const nowShowing = cityFilteredMovies.filter(
  (movie) => movie.status === "now_showing"
);

const trending = cityFilteredMovies.filter(
  (movie) =>
    movie.trending &&
    movie.status === "now_showing"
);

const upcoming = cityFilteredMovies.filter(
  (movie) => movie.status === "upcoming"
);
  const featuredMovies = cityFilteredMovies.filter(
  (movie) =>
    movie.featured &&
    movie.status === "now_showing"
) as HeroMovie[];

const heroMovies =
  featuredMovies.length > 0
    ? featuredMovies
    : (cityFilteredMovies
        .filter((movie) => movie.status === "now_showing")
        .slice(0, 5) as HeroMovie[]);
  const hasActiveFilters = Boolean(routeSearch.genre || routeSearch.language || routeSearch.minRating || routeSearch.minDuration || routeSearch.maxDuration || routeSearch.certificate || routeSearch.status || routeSearch.sort);
  const showSearchResults = Boolean(searchQuery || hasActiveFilters);

  return (
    <div className="min-h-screen bg-[color:var(--color-background)]">
      <SiteHeader />

      {!isLoading && !searchQuery && !hasActiveFilters && heroMovies.length > 0 && <HeroBanner movies={heroMovies} />}

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <GlassPanel className="inline-flex items-center gap-3 px-4 py-2">
            <MapPin className="size-4 text-[color:var(--color-gold)]" />
            <span className="text-sm text-white/80">Showing for <span className="font-semibold text-white">{city}</span></span>
          </GlassPanel>
          {showSearchResults && (
            <button type="button" onClick={() => void navigate({ to: "/", search: (previous) => ({ city: previous.city }) })} className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
              <ArrowLeft className="size-4" /> Clear search and filters
            </button>
          )}
        </div>

        <PremiumCard variant="default" hover={false} className="mb-8 p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Find Your Movie</h2>
              <p className="text-sm text-white/50">Filter by genre, language, rating, duration, certificate and release status</p>
            </div>
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <RotateCcw className="size-4" /> Reset filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Genre" value={selectedGenre} onChange={(value) => updateSearchParam("genre", value)} placeholder="All genres" options={[{ value: "All", label: "All genres" }, ...genres.map((genre) => ({ value: genre, label: genre }))]} />
            <FilterSelect label="Language" value={selectedLanguage} onChange={(value) => updateSearchParam("language", value)} placeholder="All languages" options={[{ value: "All", label: "All languages" }, ...languages.map((language) => ({ value: language, label: language }))]} />
            <FilterSelect label="Minimum rating" value={minimumRating} onChange={(value) => updateSearchParam("minRating", value)} placeholder="Any rating" options={[{ value: "0", label: "Any rating" }, ...[5, 6, 7, 8, 9].map((rating) => ({ value: String(rating), label: `${rating}+ rating` }))]} />
            <FilterSelect label="Minimum duration" value={minimumDuration} onChange={(value) => updateSearchParam("minDuration", value)} placeholder="Any duration" options={[{ value: "0", label: "Any duration" }, { value: "90", label: "90+ minutes" }, { value: "120", label: "120+ minutes" }, { value: "150", label: "150+ minutes" }]} />
            <FilterSelect label="Maximum duration" value={maximumDuration} onChange={(value) => updateSearchParam("maxDuration", value)} placeholder="No maximum" options={[{ value: "Any", label: "No maximum" }, { value: "120", label: "Up to 120 minutes" }, { value: "150", label: "Up to 150 minutes" }, { value: "180", label: "Up to 180 minutes" }]} />
            <FilterSelect label="Certificate" value={selectedCertificate} onChange={(value) => updateSearchParam("certificate", value)} placeholder="All certificates" options={[{ value: "All", label: "All certificates" }, ...certificates.map((certificate) => ({ value: certificate, label: certificate }))]} />
            <FilterSelect label="Movie status" value={selectedStatus} onChange={(value) => updateSearchParam("status", value)} placeholder="All movies" options={[{ value: "all", label: "All movies" }, { value: "now_showing", label: "Now showing" }, { value: "upcoming", label: "Upcoming" }]} />
            <FilterSelect label="Sort by" value={sortBy} onChange={(value) => updateSearchParam("sort", value)} placeholder="Top rated" options={[{ value: "rating_desc", label: "Highest rated" }, { value: "rating_asc", label: "Lowest rated" }, { value: "title_asc", label: "Title: A to Z" }, { value: "title_desc", label: "Title: Z to A" }, { value: "duration_asc", label: "Shortest duration" }, { value: "duration_desc", label: "Longest duration" }, { value: "release_desc", label: "Newest release" }]} />
          </div>
        </PremiumCard>

        {isLoading && <div className="flex items-center justify-center py-20"><div className="text-center"><Film className="mx-auto size-12 animate-pulse text-[color:var(--color-primary)]" /><p className="mt-4 text-white/60">Loading movies…</p></div></div>}
{isError && (
  <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
    <h2 className="text-lg font-semibold text-red-400">
      Could not load movies
    </h2>

    <p className="mt-2 text-sm text-white/60">
      {moviesError instanceof Error
        ? moviesError.message
        : "Unknown error occurred"}
    </p>

    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
    >
      Refresh page
    </button>
  </div>
)}

        {!isLoading && !isError && showSearchResults && (
          <PremiumCard variant="default" hover={false} className="mb-8 p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-white">{searchQuery ? "Search Results" : "Filtered Movies"}</h2>
              <p className="mt-1 text-sm text-white/60">{searchQuery ? <>Results for <span className="font-semibold text-white">“{routeSearch.search}”</span></> : "Movies matching your selected filters"} · {filteredMovies.length} found</p>
            </div>
            {filteredMovies.length > 0 ? <div className="flex flex-wrap gap-4">{filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div> : <div className="py-12 text-center"><Film className="mx-auto size-12 text-white/30" /><h3 className="mt-4 text-lg font-semibold text-white">No movies found</h3><p className="mt-2 text-sm text-white/50">Try changing your search or relaxing one of the filters.</p></div>}
          </PremiumCard>
        )}

        {!isLoading && !isError && !showSearchResults && (
  <>
    <MovieSection
      title="Now Showing"
      subtitle={`Currently playing in ${city}`}
      icon={
        <Sparkles className="size-5 text-[color:var(--color-primary)]" />
      }
      movies={nowShowing}
    />

    {trending.length > 0 && (
      <MovieSection
        title="Trending This Week"
        subtitle={`Most popular movies in ${city}`}
        icon={
          <TrendingUp className="size-5 text-[color:var(--color-gold)]" />
        }
        movies={trending}
      />
    )}

    {upcoming.length > 0 && (
      <MovieSection
        title="Upcoming Releases"
        subtitle={`Coming soon in ${city}`}
        icon={
          <CalendarClock className="size-5 text-[color:var(--color-primary)]" />
        }
        movies={upcoming}
      />
    )}
  </>
)}
      </div>
      <footer className="border-t border-white/10 py-12"><div className="container mx-auto px-4"><div className="flex flex-col items-center gap-4 text-center"><div className="flex items-center gap-2"><div className="rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-glow)] p-2"><Film className="size-5 text-white" /></div><span className="font-display text-xl font-bold text-gradient-primary">Cineverse</span></div><p className="text-sm text-white/60">© Cineverse — Movie ticketing reimagined.</p><p className="text-xs text-white/40">Mock payments enabled. No real charges are processed.</p></div></div></footer>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm text-white/70">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border-white/10 bg-white text-gray-900 focus:ring-purple-500"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent className="z-[100] max-h-72 border border-gray-200 bg-white text-gray-900 shadow-xl">
          {options.map((option) => <SelectItem key={option.value} value={option.value} className="cursor-pointer text-gray-900 focus:bg-blue-600 focus:text-white">{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function MovieSection({ title, subtitle, icon, movies }: { title: string; subtitle: string; icon: React.ReactNode; movies: Movie[] }) {
  if (movies.length === 0) return null;
  return (
    <PremiumCard variant="default" hover={false} className="mb-12 p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-white/10">{icon}</div><div><h2 className="text-2xl font-display font-bold text-white">{title}</h2><p className="text-sm text-white/60">{subtitle}</p></div></div>
      <div className="scrollbar-hide -mx-6 flex gap-4 overflow-x-auto px-6 pb-2">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
    </PremiumCard>
  );
}

function ShowtimesSection({ movies, shows, city }: { movies: Movie[]; shows: any[]; city: string }) {
  const movieMap = useMemo(
    () => new Map(movies.map((movie) => [movie.id, movie])),
    [movies]
  );

  const theatreGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        theatre: any;
        shows: any[];
      }
    >();

    shows.forEach((show) => {
      if (!show.theatre?.id) return;

      const theatreId = show.theatre.id;

      if (!groups.has(theatreId)) {
        groups.set(theatreId, {
          theatre: show.theatre,
          shows: [],
        });
      }

      groups.get(theatreId)!.shows.push(show);
    });

    return Array.from(groups.values());
  }, [shows]);

  if (theatreGroups.length === 0) {
    return (
      <PremiumCard
        variant="default"
        hover={false}
        className="mb-12 p-6 md:p-8"
      >
        <div className="py-8 text-center">
          <MapPin className="mx-auto size-10 text-white/30" />

          <h2 className="mt-4 text-xl font-semibold text-white">
            No shows available in {city}
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Try selecting another city to see available theatres
            and showtimes.
          </p>
        </div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard
      variant="default"
      hover={false}
      className="mb-12 p-6 md:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-white/10">
          <MapPin className="size-5 text-[color:var(--color-gold)]" />
        </div>

        <div>
          <h2 className="text-2xl font-display font-bold text-white">
            Showtimes in {city}
          </h2>

          <p className="text-sm text-white/60">
            Choose a theatre and showtime
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {theatreGroups.map(({ theatre, shows }) => (
          <div
            key={theatre.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-white">
                {theatre.name}
              </h3>

              <div className="mt-1 flex items-center gap-2 text-sm text-white/50">
                <MapPin className="size-3.5" />
                <span>{theatre.address}</span>
              </div>
            </div>

            <div className="space-y-4">
              {shows.map((show) => {
                const movie = movieMap.get(show.movie_id);

                return (
                  <div
                    key={show.id}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-white">
                          {movie?.title ?? "Movie"}
                        </h4>

                        {show.screen?.name && (
                          <p className="mt-1 text-xs text-white/40">
                            {show.screen.name}
                          </p>
                        )}
                      </div>

                      <span className="text-xs text-white/40">
                        {new Date(show.start_time).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[color:var(--color-primary)] hover:bg-white/10"
                        onClick={() => {
  window.location.href = `/book/${show.id}`;
}}
                      >
                        <p className="text-sm font-semibold text-white">
                          {new Date(
                            show.start_time
                          ).toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>

                        <p className="mt-1 text-xs text-white/50">
                          ₹{show.base_price}
                        </p>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}
