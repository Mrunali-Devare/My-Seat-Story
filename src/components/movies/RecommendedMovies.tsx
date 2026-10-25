
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type Movie = {
  id: string;
  title: string;
  poster_url: string | null;
  genres: string[] | null;
  rating: number | null;
  status: string;
};

type Props = {
  movieId: string;
  genres: string[] | null;
};

export function RecommendedMovies({ movieId, genres }: Props) {
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["recommended-movies", movieId, genres],
    enabled: !!movieId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("id, title, poster_url, genres, rating, status")
        .neq("id", movieId)
        .eq("status", "now_showing")
        .limit(100);

      if (error) throw error;

      const selectedGenres = (genres ?? []).map((g) =>
        g.toLowerCase().trim()
      );

      return ((data ?? []) as Movie[])
        .map((candidate) => {
          const candidateGenres = (candidate.genres ?? []).map((g) =>
            g.toLowerCase().trim()
          );

          const commonGenres = candidateGenres.filter((g) =>
            selectedGenres.includes(g)
          ).length;

          return {
            ...candidate,
            score: commonGenres,
          };
        })
        .filter((candidate) => candidate.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (b.rating ?? 0) - (a.rating ?? 0)
        )
        .slice(0, 6);
    },
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold">
        Recommended Movies
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Movies selected based on genres similar to your current movie.
      </p>

      {isLoading ? (
        <p className="mt-5 text-muted-foreground">
          Finding similar movies...
        </p>
      ) : recommendations.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed p-6 text-muted-foreground">
          No similar movies found yet. Add movies with matching
          genres and a Now Showing status to see recommendations.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {recommendations.map((movie) => (
            <Link
              key={movie.id}
              to="/movies/$id"
              params={{ id: movie.id }}
              className="group overflow-hidden rounded-xl border border-border/60 bg-card transition hover:-translate-y-1 hover:border-primary/50"
            >
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center bg-muted p-3 text-center">
                  {movie.title}
                </div>
              )}

              <div className="space-y-2 p-3">
                <h3 className="line-clamp-2 font-semibold">
                  {movie.title}
                </h3>

                <div className="flex items-center gap-1 text-sm">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  {Number(movie.rating ?? 0).toFixed(1)}
                </div>

                {(movie.genres ?? []).slice(0, 2).map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
