import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard, type MovieCardData } from "./MovieCard";

type Recommendation = {
  movie_id: string;
  movie_title: string;
  poster_url: string | null;
  rating: number | null;
  genres: string[];
  duration_minutes: number;
  certificate: string | null;
  languages: string[];
  support: number;
  confidence: number;
  lift: number;
};

export function AprioriRecommendations({
  movieTitle,
}: {
  movieTitle: string;
}) {
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["apriori-recommendations", movieTitle],
    enabled: !!movieTitle,

    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_apriori_recommendations",
        {
          p_movie_title: movieTitle,
        }
      );

      if (error) throw error;

      return (data ?? []) as Recommendation[];
    },
  });

  if (isLoading || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-14">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-primary)]">
        <Sparkles className="size-4" /> Association rules
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">Viewers also watched</h2>
      <p className="mt-2 max-w-xl text-sm text-white/60">
        People who booked <span className="font-medium text-white">{movieTitle}</span> often booked these too.
      </p>

      <div className="scrollbar-hide -mx-4 mt-8 flex scroll-pl-4 snap-x gap-5 overflow-x-auto px-4 pb-4">
        {recommendations.map((recommendation) => {
          const movie: MovieCardData = {
            id: recommendation.movie_id,
            title: recommendation.movie_title,
            poster_url: recommendation.poster_url,
            rating: recommendation.rating,
            genres: recommendation.genres,
            duration_minutes: recommendation.duration_minutes,
            certificate: recommendation.certificate,
            languages: recommendation.languages,
          };
          const confidence = Math.min(100, Math.round(recommendation.confidence * 100));

          return (
            <div key={recommendation.movie_id} className="w-[180px] shrink-0 snap-start sm:w-[200px] md:w-[220px]">
              <MovieCard movie={movie} fluid />
              <div className="mt-3 px-0.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-white">{confidence}% of them</span>
                  <span className="text-white/45">lift {recommendation.lift.toFixed(1)}x</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10" role="presentation">
                  <div className="h-full rounded-full bg-[color:var(--color-primary)]" style={{ width: `${confidence}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
