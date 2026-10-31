import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePersona } from "@/lib/demo-auth";
import clusterData from "@/data/movie-clusters.json";
import similarityData from "@/data/movie-similarity.json";
import { MovieCard, type MovieCardData } from "./MovieCard";

type Algorithm = "hdbscan" | "kmeans" | "gmm" | "dbscan";

type Recommendation = {
  movie_id: string;
  title: string;
  poster_url: string | null;
  rating: number | null;
  genres: string[];
  duration_minutes: number;
  certificate: string | null;
  languages: string[];
  cluster_label: string | null;
  similarity: number;
  in_cluster: boolean;
};

// What each algorithm does inside the app (shown under the tabs).
const ALGORITHMS: { id: Algorithm; name: string; tag: string; role: string }[] = [
  {
    id: "hdbscan",
    name: "HDBSCAN",
    tag: "Most precise",
    role: "Finds tight groups of very similar movies. Movies that fit no group are left out, so matches are precise but fewer. Best accuracy in our tests.",
  },
  {
    id: "kmeans",
    name: "K-Means",
    tag: "Always answers",
    role: "Puts every movie into exactly one of 20 broad taste groups. Always gives an answer, but groups are wide.",
  },
  {
    id: "gmm",
    name: "GMM",
    tag: "Mixed tastes",
    role: "Gives each movie a probability for several groups, so mixed tastes (e.g. 60% thriller, 40% romance) are handled.",
  },
  {
    id: "dbscan",
    name: "DBSCAN",
    tag: "Outlier-aware",
    role: "Marks dense crowds of similar movies and treats the rest as outliers. Unique movies fall back to the closest matches.",
  },
];

type Movie = Omit<Recommendation, "cluster_label" | "similarity" | "in_cluster"> & { id: string };

// Recommendation data is bundled with the app (src/data), exported from the ML models.
const clusters = clusterData as unknown as Record<string, Record<string, [number, string, number][]>>;
const similarity = similarityData as unknown as Record<string, [string, number][]>;

const bestLabel = (algorithm: Algorithm, id: string) =>
  [...(clusters[algorithm]?.[id] ?? [])].filter((c) => c[0] >= 0).sort((a, b) => b[2] - a[2])[0]?.[1] ?? null;

/** Same ranking the SQL functions used: same-cluster movies first, then by similarity. */
function genreOverlap(a: string[] = [], b: string[] = []) {
  const union = new Set([...a, ...b]).size;
  if (union === 0) return 0;
  return a.filter((g) => b.includes(g)).length / union;
}

function rank(
  movies: Movie[],
  algorithm: Algorithm,
  liked: string[],
  clusterIds: Set<number>,
  limit: number,
  allMovies: Movie[] = movies,
): Recommendation[] {
  const byId = new Map(allMovies.map((m) => [m.id, m]));
  return movies
    .filter((m) => !liked.includes(m.id))
    .map((m) => {
      // stored model score when there is one, otherwise genre overlap (new movies have no model data)
      const scores = liked.map((id) => {
        const stored = similarity[id]?.find((s) => s[0] === m.id)?.[1];
        if (stored !== undefined && stored > 0) return stored;
        return genreOverlap(m.genres, byId.get(id)?.genres) * 0.8;
      });
      return {
        movie_id: m.id,
        title: m.title,
        poster_url: m.poster_url,
        rating: m.rating,
        genres: m.genres,
        duration_minutes: m.duration_minutes,
        certificate: m.certificate,
        languages: m.languages,
        cluster_label: bestLabel(algorithm, m.id),
        similarity: scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1),
        in_cluster: (clusters[algorithm]?.[m.id] ?? []).some((c) => clusterIds.has(c[0])),
      };
    })
    .sort((a, b) => Number(b.in_cluster) - Number(a.in_cluster) || b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Cluster-based recommendations (computed in the browser, no database functions needed).
 * - With `movieId`: "More like this" for a movie page.
 * - Without it: "Picked for you" from the active demo persona's taste.
 */
export function ClusterRecommendations({ movieId }: { movieId?: string }) {
  const persona = usePersona();
  const [algorithm, setAlgorithm] = useState<Algorithm>("hdbscan");
  const personalized = !movieId;

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["cluster-recommendations", movieId ?? persona.id, algorithm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("id,title,poster_url,rating,genres,duration_minutes,certificate,languages");
      if (error) throw error;
      const movies = (data ?? []) as Movie[];

      if (movieId) {
        const ids = new Set((clusters[algorithm]?.[movieId] ?? []).filter((c) => c[0] >= 0).map((c) => c[0]));
        return rank(movies.filter((m) => m.id !== movieId), algorithm, [movieId], ids, 10, movies);
      }

      // persona taste: its 5 best-rated movies in its favourite genres
      const liked = movies
        .filter((m) => m.genres?.some((g) => persona.genres.includes(g)))
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 5)
        .map((m) => m.id);
      const strength = new Map<number, number>();
      for (const id of liked)
        for (const [cid, , w] of clusters[algorithm]?.[id] ?? [])
          if (cid >= 0) strength.set(cid, (strength.get(cid) ?? 0) + w);
      const top = new Set([...strength.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]));
      return rank(movies, algorithm, liked, top, 10);
    },
  });

  if (!isLoading && recommendations.length === 0) return null;

  const current = ALGORITHMS.find((item) => item.id === algorithm)!;
  const scope = personalized ? "me" : "movie";

  return (
    <section className="border-y border-white/10 bg-white/[0.02] py-14" aria-labelledby={`recs-${scope}`}>
      <div className="container mx-auto grid grid-cols-[minmax(0,1fr)] gap-10 px-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
        {/* Model picker */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-primary)]">
            <Brain className="size-4" /> Recommended by a model
          </p>
          <h2 id={`recs-${scope}`} className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {personalized ? "Picked for you" : "More like this"}
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {personalized
              ? `Because ${persona.name} likes ${persona.genres.slice(0, 2).join(" and ").toLowerCase()}.`
              : "Movies that sit in the same taste group."}
          </p>

          <div role="radiogroup" aria-label="Recommendation model" className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {ALGORITHMS.map((item) => {
              const active = item.id === algorithm;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAlgorithm(item.id)}
                  className={`relative rounded-lg px-4 py-3 text-left transition-colors duration-200 active:scale-[0.99] ${
                    active ? "text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={`algo-pill-${scope}`}
                      className="absolute inset-0 rounded-lg bg-white/[0.07] ring-1 ring-inset ring-[color:var(--color-primary)]/50"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-baseline justify-between gap-3">
                    <span className="font-display text-base font-semibold">{item.name}</span>
                    <span className={`hidden text-xs sm:inline ${active ? "text-[color:var(--color-primary)]" : "text-white/40"}`}>{item.tag}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-white/60" aria-live="polite">{current.role}</p>
        </div>

        {/* Results */}
        <div className="min-w-0">
          <div className="scrollbar-hide -mx-4 flex scroll-pl-4 snap-x gap-5 overflow-x-auto px-4 pb-4 pt-3">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-[180px] shrink-0 sm:w-[200px] md:w-[220px]">
                    <div className="aspect-[2/3] animate-pulse rounded-lg bg-white/5" />
                    <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-white/5" />
                    <div className="mt-3 h-1 w-full animate-pulse rounded bg-white/5" />
                  </div>
                ))
              : recommendations.map((recommendation, index) => {
                  const movie: MovieCardData = {
                    id: recommendation.movie_id,
                    title: recommendation.title,
                    poster_url: recommendation.poster_url,
                    rating: recommendation.rating,
                    genres: recommendation.genres,
                    duration_minutes: recommendation.duration_minutes,
                    certificate: recommendation.certificate,
                    languages: recommendation.languages,
                  };
                  const match = Math.min(100, Math.round(Number(recommendation.similarity) * 100));

                  return (
                    <div key={recommendation.movie_id} className="relative w-[180px] shrink-0 snap-start sm:w-[200px] md:w-[220px]">
                      <span className="pointer-events-none absolute -left-1 -top-3 z-10 font-display text-5xl font-extrabold leading-none text-black/40 [-webkit-text-stroke:1px_rgba(255,255,255,0.6)]" aria-hidden>
                        {index + 1}
                      </span>
                      <MovieCard movie={movie} fluid />
                      <div className="mt-3 px-0.5">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-semibold text-white">{match > 0 ? `${match}% match` : "Closest match"}</span>
                          <span className="truncate pl-2 text-white/45">
                            {recommendation.in_cluster ? (recommendation.cluster_label ?? "Similar taste") : "Nearby"}
                          </span>
                        </div>
                        {match > 0 && (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10" role="presentation">
                            <div className="h-full rounded-full bg-[color:var(--color-primary)]" style={{ width: `${match}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </section>
  );
}
