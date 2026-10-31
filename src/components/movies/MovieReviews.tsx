import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type MovieReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
};
type MovieReviewAnalytics = {
  total_reviews: number;
  average_rating: number;
  positive_reviews: number;
  neutral_reviews: number;
  negative_reviews: number;
};
type MovieRatingDistribution = {
  rating: number;
  review_count: number;
};

export function MovieReviews({
  movieId,
}: {
  movieId: string;
}) {
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const reviewsQuery = useQuery({
    queryKey: ["movie-reviews", movieId],
    enabled: !!movieId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, user_id")
        .eq("movie_id", movieId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []) as MovieReview[];
    },
  });
  const analyticsQuery = useQuery({
  queryKey: ["movie-review-analytics", movieId],
  enabled: !!movieId,
  queryFn: async () => {
    const { data, error } = await supabase.rpc(
      "get_movie_review_analytics",
      {
        p_movie_id: movieId,
      }
    );

    if (error) throw error;

    return data?.[0] as MovieReviewAnalytics | undefined;
  },
});
const ratingDistributionQuery = useQuery({
  queryKey: ["movie-rating-distribution", movieId],
  enabled: !!movieId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("movie_id", movieId);

    if (error) throw error;

    const counts = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      review_count: (data ?? []).filter(
        (review) => review.rating === rating
      ).length,
    }));

    return counts as MovieRatingDistribution[];
  },
});

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to submit a review.");
      }

      if (rating < 1 || rating > 5) {
        throw new Error("Please select a rating from 1 to 5.");
      }

      const { error } = await supabase
        .from("reviews")
        .upsert(
          {
            movie_id: movieId,
            user_id: user.id,
            rating,
            comment: comment.trim() || null,
          },
          {
            onConflict: "movie_id,user_id",
          }
        );

      if (error) throw error;
    },

    onSuccess: () => {
      setRating(0);
      setComment("");

      queryClient.invalidateQueries({
        queryKey: ["movie-reviews", movieId],
      });
    },
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">

        <div>
          <h2 className="text-2xl font-bold">
            Viewer Reviews
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Share your rating and experience with this movie.
          </p>
        </div>
        {analyticsQuery.isLoading ? (
  <div className="mt-6 rounded-xl border bg-muted/20 p-5">
    <p className="text-sm text-muted-foreground">
      Loading review insights...
    </p>
  </div>
) : analyticsQuery.data ? (
  <div className="mt-6 rounded-xl border bg-muted/20 p-5">
    <h3 className="text-lg font-semibold">
      Viewer Review Insights
    </h3>

    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-lg bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Average Rating
        </p>
        <p className="mt-1 text-2xl font-bold">
          {analyticsQuery.data.average_rating}/5
        </p>
      </div>

      <div className="rounded-lg bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Total Reviews
        </p>
        <p className="mt-1 text-2xl font-bold">
          {analyticsQuery.data.total_reviews}
        </p>
      </div>

      <div className="rounded-lg bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Positive
        </p>
        <p className="mt-1 text-2xl font-bold text-green-600">
          {analyticsQuery.data.positive_reviews}
        </p>
      </div>

      <div className="rounded-lg bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Negative
        </p>
        <p className="mt-1 text-2xl font-bold text-red-600">
          {analyticsQuery.data.negative_reviews}
        </p>
      </div>
    </div>
  </div>
) : null}
{ratingDistributionQuery.isLoading ? (
  <div className="mt-6 rounded-xl border bg-muted/20 p-5">
    <p className="text-sm text-muted-foreground">
      Loading rating distribution...
    </p>
  </div>
) : ratingDistributionQuery.data ? (
  <div className="mt-6 rounded-xl border bg-muted/20 p-5">
    <h3 className="text-lg font-semibold">
      Rating Distribution
    </h3>

    <div className="mt-4 space-y-3">
      {ratingDistributionQuery.data
        .slice()
        .reverse()
        .map((item) => (
          <div
            key={item.rating}
            className="flex items-center gap-3"
          >
            <div className="flex w-16 items-center gap-1 text-sm">
              <span>{item.rating}</span>
              <Star className="size-4 fill-[color:var(--color-gold)] text-[color:var(--color-gold)]" />
            </div>

            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${
                    item.review_count > 0
                      ? (item.review_count /
                          Math.max(
                            ...ratingDistributionQuery.data.map(
                              (entry) => entry.review_count
                            )
                          )) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            <span className="w-8 text-right text-sm text-muted-foreground">
              {item.review_count}
            </span>
          </div>
        ))}
    </div>
  </div>
) : null}

        {/* WRITE REVIEW */}
        <div className="mt-6 rounded-xl border bg-muted/20 p-5">
          <h3 className="font-semibold">
            Write a Review
          </h3>

          {/* RATING */}
          <div className="mt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Your Rating
            </p>

            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="rounded-md p-1 transition hover:bg-muted"
                >
                  <Star
                    className={`size-6 ${
                      value <= rating
                        ? "fill-[color:var(--color-gold)] text-[color:var(--color-gold)]"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* COMMENT */}
          <div className="mt-4">
            <label className="text-sm font-medium">
              Your Review
            </label>

            <textarea
              value={comment}
              onChange={(event) =>
                setComment(event.target.value)
              }
              placeholder="What did you think about this movie?"
              className="mt-2 min-h-[100px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {submitReviewMutation.isError && (
            <p className="mt-3 text-sm text-destructive">
              {submitReviewMutation.error instanceof Error
                ? submitReviewMutation.error.message
                : "Unable to submit review."}
            </p>
          )}

          {submitReviewMutation.isSuccess && (
            <p className="mt-3 text-sm text-green-600">
              Review submitted successfully.
            </p>
          )}

          <Button
            className="mt-4"
            disabled={
              rating === 0 ||
              submitReviewMutation.isPending
            }
            onClick={() =>
              submitReviewMutation.mutate()
            }
          >
            {submitReviewMutation.isPending
              ? "Submitting..."
              : "Submit Review"}
          </Button>
        </div>

        {/* EXISTING REVIEWS */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold">
            Recent Reviews
          </h3>

          {reviewsQuery.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Loading reviews...
            </p>
          ) : reviewsQuery.data?.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No reviews yet. Be the first to review this movie!
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {reviewsQuery.data?.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`size-4 ${
                          value <= review.rating
                            ? "fill-[color:var(--color-gold)] text-[color:var(--color-gold)]"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>

                  {review.comment && (
                    <p className="mt-3 text-sm leading-relaxed">
                      {review.comment}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(
                      review.created_at
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}