import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ticket,
  TrendingUp,
  Building2,
  Film,
  Star,
  IndianRupee,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/manager/")({
  component: ManagerDashboard,
});

type DashboardKpis = {
  total_revenue: number;
  total_bookings: number;
  total_tickets: number;
  total_reviews: number;
  total_movies: number;
  total_theatres: number;
};
type MovieRevenue = {
  movie_title: string;
  total_tickets: number;
  total_revenue: number;
};
type TheatrePerformance = {
  city: string;
  theatre_name: string;
  total_bookings: number;
  total_tickets: number;
  total_revenue: number;
};
type CityPerformance = {
  city: string;
  total_bookings: number;
  total_tickets: number;
  total_revenue: number;
};
type ReviewAnalytics = {
  movie_title: string;
  total_reviews: number;
  average_rating: number;
  positive_reviews: number;
  neutral_reviews: number;
  negative_reviews: number;
};
type ViewerSegmentation = {
  viewer_id: string;
  viewer_name: string;
  city: string;
  total_bookings: number;
  total_tickets: number;
  total_spending: number;
  average_booking_value: number;
};
type KMeansViewerSegment = {
  viewer_id: string;
  viewer_name: string;
  city: string;
  total_bookings: number;
  total_tickets: number;
  total_spending: number;
  average_booking_value: number;
  cluster: number;
  segment: string;
  silhouette_score: number;
};
type AgglomerativeViewerSegment = {
  viewer_id: string;
  viewer_name: string;
  city: string;
  total_bookings: number;
  total_tickets: number;
  total_spending: number;
  average_booking_value: number;
  cluster: number;
  segment: string;
  silhouette_score: number;
};
type AprioriRule = {
  antecedent_movie: string;
  consequent_movie: string;
  support: number;
  confidence: number;
  lift: number;
};
type DecisionTreeShow = {
  show_id: string;
  movie_title: string;
  city: string;
  theatre_name: string;
  show_date: string;
  show_time: string;
  seats_sold: number;
  revenue: number;
};
type DecisionTreePrediction = {
  show_id: string;
  movie_title: string;
  city: string;
  theatre_name: string;
  show_date: string;
  show_time: string;
  seats_sold: number;
  actual_popularity: string;
  predicted_popularity: string;
  prediction_probability: number;
};
type NaiveBayesPrediction = {
  show_id: string;
  movie_title: string;
  city: string;
  theatre_name: string;
  show_date: string;
  show_time: string;
  seats_sold: number;
  actual_popularity: string;
  predicted_popularity: string;
  prediction_probability: number;
};
type RevenuePrediction = {
  show_id: string;
  movie_title: string;
  city: string;
  theatre_name: string;
  show_date: string;
  show_time: string;
  seats_sold: number;
  actual_revenue: number;
  predicted_revenue: number;
};
type OlapCityTheatreMovie = {
  city: string;
  theatre_name: string;
  movie_title: string;
  total_bookings: number;
  total_tickets: number;
  total_revenue: number;
};
function ManagerDashboard() {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedTheatre, setSelectedTheatre] = useState<string | null>(null);
  const [sliceCity, setSliceCity] = useState<string | null>(null);
  const [diceCities, setDiceCities] = useState<string[]>([]);
const [diceMovies, setDiceMovies] = useState<string[]>([]);
const [pivotCity, setPivotCity] = useState<string | null>(null);

  const { data: liveAnalytics, isLoading } = useQuery({
    queryKey: ["live-dashboard-analytics"],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      const [
        bookingsResult,
        seatRowsResult,
        reviewsResult,
        moviesResult,
        theatresResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id,total_amount,status,payment_status,user_id,show_id,created_at"
          )
          .eq("status", "confirmed")
          .eq("payment_status", "success"),
        supabase
          .from("booking_seats")
          .select(`
            id,
            booking_id,
            seat_label,
            price,
            bookings!inner(
              id,
              user_id,
              status,
              payment_status
            ),
            show_seats!inner(
              show_id,
              shows!inner(
                movie_id,
                movies!inner(title),
                screens!inner(
                  name,
                  theaters!inner(name,city)
                )
              )
            )
          `)
          .eq("bookings.status", "confirmed")
          .eq("bookings.payment_status", "success"),
        supabase
          .from("reviews")
          .select("id,movie_id,rating"),
        supabase
          .from("movies")
          .select("id,title"),
        supabase
          .from("theaters")
          .select("id,name,city"),
        supabase
          .from("profiles")
          .select("id,full_name,city"),
      ]);

      const first = <T,>(value: T | T[] | null | undefined): T | null =>
        Array.isArray(value) ? value[0] ?? null : value ?? null;

      if (bookingsResult.error) throw bookingsResult.error;
      if (seatRowsResult.error) throw seatRowsResult.error;
      if (reviewsResult.error) throw reviewsResult.error;
      if (moviesResult.error) throw moviesResult.error;
      if (theatresResult.error) throw theatresResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const bookings = (bookingsResult.data ?? []) as Array<{
        id: string;
        total_amount: number | string | null;
        user_id: string;
      }>;

      const seatRows = (seatRowsResult.data ?? []) as any[];
      const reviews = (reviewsResult.data ?? []) as Array<{
        id: string;
        movie_id: string;
        rating: number | string;
      }>;
      const movies = (moviesResult.data ?? []) as Array<{
        id: string;
        title: string;
      }>;
      const theatres = (theatresResult.data ?? []) as Array<{
        id: string;
        name: string;
        city: string;
      }>;
      const profiles = (profilesResult.data ?? []) as Array<{
        id: string;
        full_name: string | null;
        city: string | null;
      }>;

      const movieTitleById = new Map(
        movies.map((movie) => [movie.id, movie.title])
      );
      const profileById = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const getShowContext = (row: any) => {
        const showSeat = first(row.show_seats);
        const show = first(showSeat?.shows);
        const movie = first(show?.movies);
        const screen = first(show?.screens);
        const theatre = first(screen?.theaters);

        return {
          movieId: String(show?.movie_id ?? ""),
          movieTitle:
            String(movie?.title ?? "") ||
            movieTitleById.get(String(show?.movie_id ?? "")) ||
            "Unknown Movie",
          theatreName: String(theatre?.name ?? "Unknown Theatre"),
          city: String(theatre?.city ?? "Unknown City"),
        };
      };

      const totalRevenue = bookings.reduce(
        (sum, booking) => sum + Number(booking.total_amount ?? 0),
        0
      );

      const movieMap = new Map<
        string,
        { movie_title: string; total_tickets: number; total_revenue: number }
      >();

      const theatreMap = new Map<
        string,
        {
          city: string;
          theatre_name: string;
          total_tickets: number;
          total_revenue: number;
          booking_ids: Set<string>;
        }
      >();

      const cityMap = new Map<
        string,
        {
          city: string;
          total_tickets: number;
          total_revenue: number;
          booking_ids: Set<string>;
        }
      >();

      const olapMap = new Map<
        string,
        {
          city: string;
          theatre_name: string;
          movie_title: string;
          total_tickets: number;
          total_revenue: number;
          booking_ids: Set<string>;
        }
      >();

      for (const row of seatRows) {
        const context = getShowContext(row);
        const bookingId = String(row.booking_id ?? "");
        const seatPrice = Number(row.price ?? 0);

        const movieKey = context.movieId || context.movieTitle;
        const movieExisting = movieMap.get(movieKey) ?? {
          movie_title: context.movieTitle,
          total_tickets: 0,
          total_revenue: 0,
        };
        movieExisting.total_tickets += 1;
        movieExisting.total_revenue += seatPrice;
        movieMap.set(movieKey, movieExisting);

        const theatreKey = `${context.city}|||${context.theatreName}`;
        const theatreExisting = theatreMap.get(theatreKey) ?? {
          city: context.city,
          theatre_name: context.theatreName,
          total_tickets: 0,
          total_revenue: 0,
          booking_ids: new Set<string>(),
        };
        theatreExisting.total_tickets += 1;
        theatreExisting.total_revenue += seatPrice;
        if (bookingId) theatreExisting.booking_ids.add(bookingId);
        theatreMap.set(theatreKey, theatreExisting);

        const cityExisting = cityMap.get(context.city) ?? {
          city: context.city,
          total_tickets: 0,
          total_revenue: 0,
          booking_ids: new Set<string>(),
        };
        cityExisting.total_tickets += 1;
        cityExisting.total_revenue += seatPrice;
        if (bookingId) cityExisting.booking_ids.add(bookingId);
        cityMap.set(context.city, cityExisting);

        const olapKey = `${context.city}|||${context.theatreName}|||${context.movieTitle}`;
        const olapExisting = olapMap.get(olapKey) ?? {
          city: context.city,
          theatre_name: context.theatreName,
          movie_title: context.movieTitle,
          total_tickets: 0,
          total_revenue: 0,
          booking_ids: new Set<string>(),
        };
        olapExisting.total_tickets += 1;
        olapExisting.total_revenue += seatPrice;
        if (bookingId) olapExisting.booking_ids.add(bookingId);
        olapMap.set(olapKey, olapExisting);
      }

      const movieRevenue: MovieRevenue[] = Array.from(movieMap.values()).sort(
        (a, b) => b.total_revenue - a.total_revenue
      );

      const theatrePerformance: TheatrePerformance[] = Array.from(
        theatreMap.values()
      )
        .map((item) => ({
          city: item.city,
          theatre_name: item.theatre_name,
          total_bookings: item.booking_ids.size,
          total_tickets: item.total_tickets,
          total_revenue: item.total_revenue,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

      const cityPerformance: CityPerformance[] = Array.from(cityMap.values())
        .map((item) => ({
          city: item.city,
          total_bookings: item.booking_ids.size,
          total_tickets: item.total_tickets,
          total_revenue: item.total_revenue,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

      const reviewMap = new Map<
        string,
        {
          movie_title: string;
          total_reviews: number;
          rating_sum: number;
          positive_reviews: number;
          neutral_reviews: number;
          negative_reviews: number;
        }
      >();

      for (const review of reviews) {
        const movieTitle =
          movieTitleById.get(review.movie_id) ?? "Unknown Movie";
        const rating = Number(review.rating ?? 0);
        const existing = reviewMap.get(review.movie_id) ?? {
          movie_title: movieTitle,
          total_reviews: 0,
          rating_sum: 0,
          positive_reviews: 0,
          neutral_reviews: 0,
          negative_reviews: 0,
        };

        existing.total_reviews += 1;
        existing.rating_sum += rating;

        if (rating >= 4) existing.positive_reviews += 1;
        else if (rating === 3) existing.neutral_reviews += 1;
        else existing.negative_reviews += 1;

        reviewMap.set(review.movie_id, existing);
      }

      const reviewAnalytics: ReviewAnalytics[] = Array.from(
        reviewMap.values()
      )
        .map((item) => ({
          movie_title: item.movie_title,
          total_reviews: item.total_reviews,
          average_rating:
            item.total_reviews > 0
              ? item.rating_sum / item.total_reviews
              : 0,
          positive_reviews: item.positive_reviews,
          neutral_reviews: item.neutral_reviews,
          negative_reviews: item.negative_reviews,
        }))
        .sort((a, b) => b.total_reviews - a.total_reviews);

      const viewerMap = new Map<
        string,
        {
          viewer_id: string;
          viewer_name: string;
          city: string;
          total_bookings: number;
          total_tickets: number;
          total_spending: number;
        }
      >();

      for (const booking of bookings) {
        const profile = profileById.get(booking.user_id);
        const existing = viewerMap.get(booking.user_id) ?? {
          viewer_id: booking.user_id,
          viewer_name: profile?.full_name || "Viewer",
          city: profile?.city || "Unknown City",
          total_bookings: 0,
          total_tickets: 0,
          total_spending: 0,
        };

        existing.total_bookings += 1;
        existing.total_spending += Number(booking.total_amount ?? 0);
        viewerMap.set(booking.user_id, existing);
      }

      for (const row of seatRows) {
        const booking = first(row.bookings);
        const userId = String(booking?.user_id ?? "");
        if (!userId) continue;

        const profile = profileById.get(userId);
        const existing = viewerMap.get(userId) ?? {
          viewer_id: userId,
          viewer_name: profile?.full_name || "Viewer",
          city: profile?.city || "Unknown City",
          total_bookings: 0,
          total_tickets: 0,
          total_spending: 0,
        };

        existing.total_tickets += 1;
        viewerMap.set(userId, existing);
      }

      const viewerSegmentation: ViewerSegmentation[] = Array.from(
        viewerMap.values()
      )
        .map((viewer) => ({
          ...viewer,
          average_booking_value:
            viewer.total_bookings > 0
              ? viewer.total_spending / viewer.total_bookings
              : 0,
        }))
        .sort((a, b) => b.total_spending - a.total_spending);

      const olapData: OlapCityTheatreMovie[] = Array.from(olapMap.values())
        .map((item) => ({
          city: item.city,
          theatre_name: item.theatre_name,
          movie_title: item.movie_title,
          total_bookings: item.booking_ids.size,
          total_tickets: item.total_tickets,
          total_revenue: item.total_revenue,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

      const kpis: DashboardKpis = {
        total_revenue: totalRevenue,
        total_bookings: bookings.length,
        total_tickets: seatRows.length,
        total_reviews: reviews.length,
        total_movies: movies.length,
        total_theatres: theatres.length,
      };

      return {
        kpis,
        movieRevenue,
        theatrePerformance,
        cityPerformance,
        reviewAnalytics,
        viewerSegmentation,
        olapData,
      };
    },
  });

  const stats = liveAnalytics?.kpis;
  const movieRevenue = liveAnalytics?.movieRevenue ?? [];
  const movieRevenueLoading = isLoading;
  const theatrePerformance = liveAnalytics?.theatrePerformance ?? [];
  const theatrePerformanceLoading = isLoading;
  const cityPerformance = liveAnalytics?.cityPerformance ?? [];
  const cityPerformanceLoading = isLoading;
  const reviewAnalytics = liveAnalytics?.reviewAnalytics ?? [];
  const reviewAnalyticsLoading = isLoading;
  const viewerSegmentation = liveAnalytics?.viewerSegmentation ?? [];
  const viewerSegmentationLoading = isLoading;
  const olapData = liveAnalytics?.olapData ?? [];
  const olapLoading = isLoading;

  const kMeansViewerSegmentsQuery = useQuery({
    queryKey: ["kmeans-viewer-segments"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_kmeans_viewer_segments"
      );

      if (error) throw error;

      return (data ?? []) as KMeansViewerSegment[];
    },
  });

  const agglomerativeViewerSegmentsQuery = useQuery({
    queryKey: ["agglomerative-viewer-segments"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_agglomerative_viewer_segments"
      );

      if (error) throw error;

      return (data ?? []) as AgglomerativeViewerSegment[];
    },
  });

  const aprioriRulesQuery = useQuery({
    queryKey: ["apriori-rules"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_apriori_rules");

      if (error) throw error;

      return (data ?? []) as AprioriRule[];
    },
  });

  const { data: decisionTreeData = [], isLoading: decisionTreeLoading } =
    useQuery({
      queryKey: ["decision-tree-shows"],
      refetchInterval: 15000,
      queryFn: async () => {
        const { data, error } = await supabase.rpc(
          "get_ml_movie_popularity"
        );

        if (error) throw error;

        return (data ?? []) as DecisionTreeShow[];
      },
    });

  const {
    data: decisionTreePredictions = [],
    isLoading: decisionTreePredictionsLoading,
  } = useQuery({
    queryKey: ["decision-tree-predictions"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_decision_tree_predictions"
      );

      if (error) throw error;

      return (data ?? []) as DecisionTreePrediction[];
    },
  });

  const {
    data: naiveBayesPredictions = [],
    isLoading: naiveBayesPredictionsLoading,
  } = useQuery({
    queryKey: ["naive-bayes-predictions"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_naive_bayes_predictions"
      );

      if (error) throw error;

      return (data ?? []) as NaiveBayesPrediction[];
    },
  });

  const {
    data: revenuePredictions = [],
    isLoading: revenuePredictionsLoading,
  } = useQuery({
    queryKey: ["revenue-predictions"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_revenue_predictions");

      if (error) throw error;

      return (data ?? []) as RevenuePrediction[];
    },
  });

  const kMeansClusterSummary = Array.from(
    new Map(
      (kMeansViewerSegmentsQuery.data ?? []).map((viewer) => [
        viewer.cluster,
        {
          cluster: viewer.cluster,
          segment: viewer.segment,
          viewer_count: 0,
          average_spending: 0,
        },
      ])
    ).values()
  ).map((cluster) => {
    const viewers =
      kMeansViewerSegmentsQuery.data?.filter(
        (viewer) => viewer.cluster === cluster.cluster
      ) ?? [];

    return {
      ...cluster,
      viewer_count: viewers.length,
      average_spending:
        viewers.reduce(
          (sum, viewer) => sum + Number(viewer.total_spending),
          0
        ) / (viewers.length || 1),
    };
  });

  const agglomerativeClusterSummary = Array.from(
    new Map(
      (agglomerativeViewerSegmentsQuery.data ?? []).map((viewer) => [
        viewer.cluster,
        {
          cluster: viewer.cluster,
          segment: viewer.segment,
          viewer_count: 0,
          average_spending: 0,
        },
      ])
    ).values()
  ).map((cluster) => {
    const viewers =
      agglomerativeViewerSegmentsQuery.data?.filter(
        (viewer) => viewer.cluster === cluster.cluster
      ) ?? [];

    return {
      ...cluster,
      viewer_count: viewers.length,
      average_spending:
        viewers.reduce(
          (sum, viewer) => sum + Number(viewer.total_spending),
          0
        ) / (viewers.length || 1),
    };
  });

  const olapRollup = Array.from(
    new Map(
      olapData.map((item) => [
        item.city,
        {
          city: item.city,
          total_bookings: 0,
          total_tickets: 0,
          total_revenue: 0,
        },
      ])
    ).values()
  ).map((city) => {
    const cityData = olapData.filter((item) => item.city === city.city);
    cityData.forEach((item) => {
      // City-level OLAP rows already contain distinct bookings per
      // theatre/movie, so bookings are summed here to preserve the
      // existing cube grain.
      city.total_bookings += Number(item.total_bookings);
      city.total_tickets += Number(item.total_tickets);
      city.total_revenue += Number(item.total_revenue);
    });

    return city;
  });

  const decisionTreeChartData = decisionTreePredictions.slice(0, 20).map(
    (prediction) => {
      const raw = Number(prediction.prediction_probability ?? 0);
      return {
        ...prediction,
        prediction_probability: raw <= 1 ? raw * 100 : raw,
      };
    }
  );

  const naiveBayesChartData = naiveBayesPredictions.slice(0, 20).map(
    (prediction) => {
      const raw = Number(prediction.prediction_probability ?? 0);
      return {
        ...prediction,
        prediction_probability_pct: raw <= 1 ? raw * 100 : raw,
      };
    }
  );


  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl border border-border/60 bg-card"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Dashboard heading */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Analytics Dashboard
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Data warehouse overview of your movie platform
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          icon={<IndianRupee className="size-5" />}
          label="Total Revenue"
          value={inr(Number(stats?.total_revenue ?? 0))}
        />

        <Stat
          icon={<Ticket className="size-5" />}
          label="Total Bookings"
          value={String(stats?.total_bookings ?? 0)}
        />

        <Stat
          icon={<TrendingUp className="size-5" />}
          label="Tickets Sold"
          value={String(stats?.total_tickets ?? 0)}
        />

        <Stat
          icon={<Star className="size-5" />}
          label="Reviews"
          value={String(stats?.total_reviews ?? 0)}
        />

        <Stat
          icon={<Film className="size-5" />}
          label="Movies"
          value={String(stats?.total_movies ?? 0)}
        />

        <Stat
          icon={<Building2 className="size-5" />}
          label="Theatres"
          value={String(stats?.total_theatres ?? 0)}
        />
      </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Revenue by Movie</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Movie-wise revenue and ticket performance from the data warehouse
          </p>
        </div>

        {movieRevenueLoading ? (
          <div className="h-[400px] animate-pulse rounded-xl bg-muted/30" />
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movieRevenue}
                margin={{
                  top: 10,
                  right: 20,
                  left: 20,
                  bottom: 80,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                <XAxis
                  dataKey="movie_title"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={100}
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  tickFormatter={(value) => `₹${value}`}
                />

                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined
                      ? [`₹${value.toLocaleString("en-IN")}`, "Revenue"]
                      : []
                  }
                />

                <Bar
                  dataKey="total_revenue"
                  name="Revenue"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
            {/* Theatre Performance */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">
            Theatre Performance
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Theatre-wise bookings, tickets sold, and revenue
          </p>
        </div>

        {theatrePerformanceLoading ? (
          <div className="h-[400px] animate-pulse rounded-xl bg-muted/30" />
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={theatrePerformance}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 30,
                  left: 180,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.2}
                />

                <XAxis
                  type="number"
                  tickFormatter={(value) => `₹${value}`}
                />

                <YAxis
                  type="category"
                  dataKey="theatre_name"
                  width={170}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined
                      ? [`₹${value.toLocaleString("en-IN")}`, "Revenue"]
                      : []
                  }
                />

                <Bar
                  dataKey="total_revenue"
                  name="Revenue"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {/* City Performance */}
<div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
  <div className="mb-6">
    <h2 className="text-xl font-semibold">
      City Performance
    </h2>

    <p className="mt-1 text-sm text-muted-foreground">
      City-wise bookings, tickets sold, and revenue
    </p>
  </div>

  {cityPerformanceLoading ? (
    <div className="h-[400px] animate-pulse rounded-xl bg-muted/30" />
  ) : (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={cityPerformance}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 50,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            opacity={0.2}
          />

          <XAxis
            dataKey="city"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tickFormatter={(value) => `₹${value}`}
          />

          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined
                ? [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Revenue",
                  ]
                : []
            }
          />

          <Bar
            dataKey="total_revenue"
            name="Revenue"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )}
</div>
<Card>
  <CardHeader>
    <CardTitle>Review Analytics</CardTitle>
    <CardDescription>
      Positive, neutral and negative reviews by movie
    </CardDescription>
  </CardHeader>

  <CardContent>
  {reviewAnalyticsLoading ? (
    <div className="h-[350px] flex items-center justify-center">
      Loading review analytics...
    </div>
  ) : (
    <div className="space-y-8">

      {/* SENTIMENT CHART */}
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={reviewAnalytics}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 80,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="movie_title"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={100}
            />

            <YAxis allowDecimals={false} />

            <Tooltip />

            <Legend />

            <Bar
              dataKey="positive_reviews"
              name="Positive"
            />

            <Bar
              dataKey="neutral_reviews"
              name="Neutral"
            />

            <Bar
              dataKey="negative_reviews"
              name="Negative"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* REVIEW SUMMARY TABLE */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Movie</TableHead>
              <TableHead>Total Reviews</TableHead>
              <TableHead>Average Rating</TableHead>
              <TableHead>Positive</TableHead>
              <TableHead>Neutral</TableHead>
              <TableHead>Negative</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {reviewAnalytics.map((review) => (
              <TableRow key={review.movie_title}>
                <TableCell className="font-medium">
                  {review.movie_title}
                </TableCell>

                <TableCell>
                  {review.total_reviews}
                </TableCell>

                <TableCell>
                  ⭐ {Number(review.average_rating).toFixed(2)}
                </TableCell>

                <TableCell>
                  {review.positive_reviews}
                </TableCell>

                <TableCell>
                  {review.neutral_reviews}
                </TableCell>

                <TableCell>
                  {review.negative_reviews}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </div>
  )}
</CardContent>
</Card>
<div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
  <div className="mb-6">
    <h2 className="text-xl font-semibold">
      Viewer Segmentation
    </h2>

    <p className="mt-1 text-sm text-muted-foreground">
      Viewer behaviour used for K-Means clustering
    </p>
  </div>

  {viewerSegmentationLoading ? (
    <div className="h-[400px] animate-pulse rounded-xl bg-muted/30" />
  ) : (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={viewerSegmentation}
          layout="vertical"
          margin={{
            top: 10,
            right: 30,
            left: 120,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            opacity={0.2}
          />

          <XAxis
            type="number"
            tickFormatter={(value) => `₹${value}`}
          />

          <YAxis
            type="category"
            dataKey="viewer_name"
            width={110}
            tick={{ fontSize: 11 }}
          />

          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined
                ? [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Spending",
                  ]
                : []
            }
          />

          <Bar
            dataKey="total_spending"
            name="Total Spending"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )}
</div>
<Card>
  <CardHeader>
    <CardTitle>K-Means Viewer Segmentation</CardTitle>
    <CardDescription>
      Viewer segments generated using K-Means clustering
    </CardDescription>
  </CardHeader>

  <CardContent>
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Clusters</p>
          <p className="text-2xl font-bold">
            {new Set(
              kMeansViewerSegmentsQuery.data?.map(
                (item) => item.cluster
              )
            ).size || 0}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Silhouette Score
          </p>
          <p className="text-2xl font-bold">
            {kMeansViewerSegmentsQuery.data?.[0]?.silhouette_score?.toFixed(
              4
            ) ?? "0.0000"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Viewers Analyzed
          </p>
          <p className="text-2xl font-bold">
            {kMeansViewerSegmentsQuery.data?.length ?? 0}
          </p>
        </div>
      </div>
<div className="h-[300px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={kMeansClusterSummary}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="segment"
        tick={{ fontSize: 12 }}
      />
      <YAxis />
      <Tooltip
        formatter={(value: number) =>
          inr(Number(value))
        }
      />
      <Bar
        dataKey="total_spending"
        name="Average Spending"
      >
        {kMeansClusterSummary.map((entry) => (
          <Cell key={entry.cluster} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Viewer</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Bookings</TableHead>
            <TableHead>Tickets</TableHead>
            <TableHead>Spending</TableHead>
            <TableHead>Cluster</TableHead>
            <TableHead>Segment</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {kMeansViewerSegmentsQuery.data?.map((viewer) => (
            <TableRow key={viewer.viewer_id}>
              <TableCell className="font-medium">
                {viewer.viewer_name}
              </TableCell>

              <TableCell>{viewer.city}</TableCell>

              <TableCell>{viewer.total_bookings}</TableCell>

              <TableCell>{viewer.total_tickets}</TableCell>

              <TableCell>
                {inr(viewer.total_spending)}
              </TableCell>

              <TableCell>
                {viewer.cluster}
              </TableCell>

              <TableCell>
                {viewer.segment}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>Agglomerative Viewer Clustering</CardTitle>
    <CardDescription>
      Viewer segments generated using hierarchical agglomerative clustering
    </CardDescription>
  </CardHeader>

  <CardContent>
    <div className="space-y-8">

      {/* CLUSTER SPENDING CHART */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">
          Viewer Spending by Cluster
        </h3>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={agglomerativeViewerSegmentsQuery.data ?? []}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 80,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
              />

              <XAxis
                dataKey="viewer_name"
                angle={-45}
                textAnchor="end"
                interval={0}
                height={100}
                tick={{ fontSize: 11 }}
              />

              <YAxis
                tickFormatter={(value) => `₹${value}`}
              />

              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined
                    ? [
                        `₹${value.toLocaleString("en-IN")}`,
                        "Spending",
                      ]
                    : []
                }
              />

              <Legend />

              <Bar
                dataKey="total_spending"
                name="Total Spending"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXISTING SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Clusters
          </p>

          <p className="text-2xl font-bold">
            {new Set(
              agglomerativeViewerSegmentsQuery.data?.map(
                (item) => item.cluster
              )
            ).size || 0}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Silhouette Score
          </p>

          <p className="text-2xl font-bold">
            {agglomerativeViewerSegmentsQuery.data?.[0]?.silhouette_score?.toFixed(
              4
            ) ?? "0.0000"}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Viewers Analyzed
          </p>

          <p className="text-2xl font-bold">
            {agglomerativeViewerSegmentsQuery.data?.length ?? 0}
          </p>
        </div>
      </div>

      {/* EXISTING TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Viewer</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Bookings</TableHead>
            <TableHead>Tickets</TableHead>
            <TableHead>Spending</TableHead>
            <TableHead>Cluster</TableHead>
            <TableHead>Segment</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {agglomerativeViewerSegmentsQuery.data?.map((viewer) => (
            <TableRow key={viewer.viewer_id}>
              <TableCell className="font-medium">
                {viewer.viewer_name}
              </TableCell>

              <TableCell>
                {viewer.city}
              </TableCell>

              <TableCell>
                {viewer.total_bookings}
              </TableCell>

              <TableCell>
                {viewer.total_tickets}
              </TableCell>

              <TableCell>
                {inr(viewer.total_spending)}
              </TableCell>

              <TableCell>
                {viewer.cluster}
              </TableCell>

              <TableCell>
                {viewer.segment}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

    </div>
  </CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>Apriori Movie Associations</CardTitle>
    <CardDescription>
      Movie viewing patterns discovered from viewer transactions
    </CardDescription>
  </CardHeader>

  <CardContent>
    <div className="space-y-8">

      {/* ASSOCIATION RULES CHART */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">
          Movie Association Lift
        </h3>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={aprioriRulesQuery.data ?? []}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 100,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
              />

              <XAxis
                dataKey="consequent_movie"
                angle={-45}
                textAnchor="end"
                interval={0}
                height={120}
                tick={{ fontSize: 10 }}
              />

              <YAxis
                tickFormatter={(value) => value.toFixed(1)}
              />

              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined
                    ? [value.toFixed(2), "Lift"]
                    : []
                }
              />

              <Legend />

              <Bar
                dataKey="lift"
                name="Association Lift"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXISTING TABLE */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Movie Watched</TableHead>
              <TableHead>Recommended Movie</TableHead>
              <TableHead>Support</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Lift</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {aprioriRulesQuery.data?.map((rule, index) => (
              <TableRow
                key={`${rule.antecedent_movie}-${rule.consequent_movie}-${index}`}
              >
                <TableCell className="font-medium">
                  {rule.antecedent_movie}
                </TableCell>

                <TableCell>
                  {rule.consequent_movie}
                </TableCell>

                <TableCell>
                  {(Number(rule.support) * 100).toFixed(0)}%
                </TableCell>

                <TableCell>
                  {(Number(rule.confidence) * 100).toFixed(0)}%
                </TableCell>

                <TableCell>
                  {Number(rule.lift).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

    </div>
  </CardContent>
</Card>
<Card className="mt-6">
  <CardHeader>
    <CardTitle>Decision Tree — Movie Popularity</CardTitle>
    <CardDescription>
      Decision Tree classification results using the current show and booking data.
    </CardDescription>
  </CardHeader>

  <CardContent>
    {decisionTreeLoading || decisionTreePredictionsLoading ? (
      <div className="py-8 text-center text-muted-foreground">
        Loading Decision Tree analysis...
      </div>
    ) : decisionTreeData.length === 0 && decisionTreePredictions.length === 0 ? (
      <div className="py-8 text-center text-muted-foreground">
        No Decision Tree results are available yet. Confirmed successful bookings are required for the model to learn from real transactions.
      </div>
    ) : (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Shows Analysed</p>
            <p className="text-2xl font-bold">{decisionTreeData.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Predictions</p>
            <p className="text-2xl font-bold">{decisionTreePredictions.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Model</p>
            <p className="text-2xl font-bold">Decision Tree</p>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={decisionTreeChartData}
              margin={{ top: 10, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="movie_title"
                angle={-45}
                textAnchor="end"
                interval={0}
                height={100}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined
                    ? [`${value.toFixed(2)}%`, "Probability"]
                    : []
                }
              />
              <Legend />
              <Bar
                dataKey="prediction_probability"
                name="Prediction Probability"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movie</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Theatre</TableHead>
                <TableHead>Show Time</TableHead>
                <TableHead>Seats Sold</TableHead>
                <TableHead>Actual Popularity</TableHead>
                <TableHead>Predicted Popularity</TableHead>
                <TableHead>Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisionTreePredictions.slice(0, 20).map((prediction) => {
                const rawProbability = Number(prediction.prediction_probability ?? 0);
                const probability = rawProbability <= 1 ? rawProbability * 100 : rawProbability;

                return (
                  <TableRow key={prediction.show_id}>
                    <TableCell className="font-medium">{prediction.movie_title}</TableCell>
                    <TableCell>{prediction.city}</TableCell>
                    <TableCell>{prediction.theatre_name}</TableCell>
                    <TableCell>{prediction.show_time}</TableCell>
                    <TableCell>{prediction.seats_sold}</TableCell>
                    <TableCell>{prediction.actual_popularity}</TableCell>
                    <TableCell>{prediction.predicted_popularity}</TableCell>
                    <TableCell>{probability.toFixed(2)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    )}
  </CardContent>
</Card>
<Card className="mt-6">
  <CardHeader>
    <CardTitle>Naïve Bayes — Movie Popularity</CardTitle>
    <CardDescription>
      Naïve Bayes predictions for movie-show popularity based on movie,
      city, theatre, day and show time.
    </CardDescription>
  </CardHeader>

  <CardContent>
  {naiveBayesPredictionsLoading ? (
    <div className="py-8 text-center text-muted-foreground">
      Loading Naïve Bayes predictions...
    </div>
  ) : naiveBayesPredictions.length === 0 ? (
    <div className="py-8 text-center text-muted-foreground">
      No Naïve Bayes predictions available.
    </div>
  ) : (
    <div className="space-y-8">

      {/* PREDICTION PROBABILITY CHART */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={naiveBayesChartData}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 80,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.2}
            />

            <XAxis
              dataKey="movie_title"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={100}
              tick={{ fontSize: 11 }}
            />

            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />

            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined
                  ? [`${value.toFixed(2)}%`, "Probability"]
                  : []
              }
            />

            <Legend />

            <Bar
              dataKey="prediction_probability_pct"
              name="Prediction Probability (%)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* EXISTING TABLE */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Movie</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Theatre</TableHead>
              <TableHead>Show Time</TableHead>
              <TableHead>Seats Sold</TableHead>
              <TableHead>Actual Popularity</TableHead>
              <TableHead>Predicted Popularity</TableHead>
              <TableHead>Probability</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {naiveBayesPredictions
              .slice(0, 20)
              .map((prediction) => (
                <TableRow key={prediction.show_id}>
                  <TableCell className="font-medium">
                    {prediction.movie_title}
                  </TableCell>

                  <TableCell>
                    {prediction.city}
                  </TableCell>

                  <TableCell>
                    {prediction.theatre_name}
                  </TableCell>

                  <TableCell>
                    {prediction.show_time}
                  </TableCell>

                  <TableCell>
                    {prediction.seats_sold}
                  </TableCell>

                  <TableCell>
                    {prediction.actual_popularity}
                  </TableCell>

                  <TableCell>
                    {prediction.predicted_popularity}
                  </TableCell>

                  <TableCell>
                    {(Number(prediction.prediction_probability) * 100).toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

    </div>
  )}
</CardContent>
</Card>
<Card className="mt-6">
  <CardHeader>
    <CardTitle>Linear Regression — Revenue Prediction</CardTitle>
    <CardDescription>
      Predicted show revenue based on seats sold, movie, city,
      theatre, day and show time.
    </CardDescription>
  </CardHeader>

  <CardContent>
  {revenuePredictionsLoading ? (
    <div className="py-8 text-center text-muted-foreground">
      Loading revenue predictions...
    </div>
  ) : revenuePredictions.length === 0 ? (
    <div className="py-8 text-center text-muted-foreground">
      No revenue predictions available.
    </div>
  ) : (
    <div className="space-y-8">

      {/* ACTUAL VS PREDICTED CHART */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={revenuePredictions.slice(0, 20)}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 80,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.2}
            />

            <XAxis
              dataKey="movie_title"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={100}
              tick={{ fontSize: 11 }}
            />

            <YAxis
              tickFormatter={(value) => `₹${value}`}
            />

            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined
                  ? [
                      `₹${value.toLocaleString("en-IN")}`,
                      "Revenue",
                    ]
                  : []
              }
            />

            <Legend />

            <Bar
              dataKey="actual_revenue"
              name="Actual Revenue"
              radius={[6, 6, 0, 0]}
            />

            <Bar
              dataKey="predicted_revenue"
              name="Predicted Revenue"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* EXISTING TABLE */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Movie</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Theatre</TableHead>
              <TableHead>Show Time</TableHead>
              <TableHead>Seats Sold</TableHead>
              <TableHead>Actual Revenue</TableHead>
              <TableHead>Predicted Revenue</TableHead>
              <TableHead>Difference</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {revenuePredictions
              .slice(0, 20)
              .map((prediction) => {
                const actual = Number(
                  prediction.actual_revenue
                );

                const predicted = Number(
                  prediction.predicted_revenue
                );

                const difference = actual - predicted;

                return (
                  <TableRow key={prediction.show_id}>
                    <TableCell className="font-medium">
                      {prediction.movie_title}
                    </TableCell>

                    <TableCell>
                      {prediction.city}
                    </TableCell>

                    <TableCell>
                      {prediction.theatre_name}
                    </TableCell>

                    <TableCell>
                      {prediction.show_time}
                    </TableCell>

                    <TableCell>
                      {prediction.seats_sold}
                    </TableCell>

                    <TableCell>
                      {inr(actual)}
                    </TableCell>

                    <TableCell>
                      {inr(predicted)}
                    </TableCell>

                    <TableCell>
                      {inr(difference)}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

    </div>
  )}
</CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>OLAP — City → Theatre → Movie</CardTitle>
    <CardDescription>
      Drill down from city revenue to theatre and individual movie performance.
    </CardDescription>
  </CardHeader>

  <CardContent>
    {olapLoading ? (
      <p className="text-sm text-muted-foreground">
        Loading OLAP data...
      </p>
    ) : (
      <div className="space-y-6">

        {/* LEVEL 1 — CITY */}
        <div>
          <h3 className="mb-3 text-lg font-semibold">
            1. City
          </h3>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from(
              new Set(olapData.map((item) => item.city))
            ).map((city) => {
              const cityData = olapData.filter(
                (item) => item.city === city
              );

              const revenue = cityData.reduce(
                (sum, item) => sum + Number(item.total_revenue),
                0
              );

              const tickets = cityData.reduce(
                (sum, item) => sum + Number(item.total_tickets),
                0
              );

              return (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setSelectedTheatre(null);
                  }}
                  className={`rounded-lg border p-4 text-left transition hover:bg-muted ${
                    selectedCity === city
                      ? "border-primary bg-muted"
                      : ""
                  }`}
                >
                  <p className="font-semibold">{city}</p>

                  <p className="text-sm text-muted-foreground">
                    Tickets: {tickets}
                  </p>

                  <p className="mt-1 font-medium">
                    Revenue: {inr(revenue)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* LEVEL 2 — THEATRE */}
        {selectedCity && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                2. Theatres in {selectedCity}
              </h3>

              <button
                onClick={() => {
                  setSelectedCity(null);
                  setSelectedTheatre(null);
                }}
                className="text-sm text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {Array.from(
                new Set(
                  olapData
                    .filter((item) => item.city === selectedCity)
                    .map((item) => item.theatre_name)
                )
              ).map((theatre) => {
                const theatreData = olapData.filter(
                  (item) =>
                    item.city === selectedCity &&
                    item.theatre_name === theatre
                );

                const revenue = theatreData.reduce(
                  (sum, item) =>
                    sum + Number(item.total_revenue),
                  0
                );

                const tickets = theatreData.reduce(
                  (sum, item) =>
                    sum + Number(item.total_tickets),
                  0
                );

                return (
                  <button
                    key={theatre}
                    onClick={() => setSelectedTheatre(theatre)}
                    className={`rounded-lg border p-4 text-left transition hover:bg-muted ${
                      selectedTheatre === theatre
                        ? "border-primary bg-muted"
                        : ""
                    }`}
                  >
                    <p className="font-semibold">
                      {theatre}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Tickets: {tickets}
                    </p>

                    <p className="mt-1 font-medium">
                      Revenue: {inr(revenue)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 3 — MOVIE */}
        {selectedCity && selectedTheatre && (
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              3. Movies in {selectedTheatre}
            </h3>

            {/* MOVIE REVENUE CHART */}
            <div className="mb-8 h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={olapData
                    .filter(
                      (item) =>
                        item.city === selectedCity &&
                        item.theatre_name === selectedTheatre
                    )
                    .sort(
                      (a, b) =>
                        Number(b.total_revenue) -
                        Number(a.total_revenue)
                    )}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 80,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.2}
                  />

                  <XAxis
                    dataKey="movie_title"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={100}
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    tickFormatter={(value) => `₹${value}`}
                  />

                  <Tooltip
                    formatter={(value: number | undefined) =>
                      value !== undefined
                        ? [
                            `₹${value.toLocaleString("en-IN")}`,
                            "Revenue",
                          ]
                        : []
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="total_revenue"
                    name="Movie Revenue"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* MOVIE TABLE */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Movie</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {olapData
                    .filter(
                      (item) =>
                        item.city === selectedCity &&
                        item.theatre_name === selectedTheatre
                    )
                    .sort(
                      (a, b) =>
                        Number(b.total_revenue) -
                        Number(a.total_revenue)
                    )
                    .map((item) => (
                      <TableRow
                        key={`${item.city}-${item.theatre_name}-${item.movie_title}`}
                      >
                        <TableCell className="font-medium">
                          {item.movie_title}
                        </TableCell>

                        <TableCell>
                          {item.total_bookings}
                        </TableCell>

                        <TableCell>
                          {item.total_tickets}
                        </TableCell>

                        <TableCell>
                          {inr(Number(item.total_revenue))}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    )}
  </CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>OLAP Roll-up — City Summary</CardTitle>

    <CardDescription>
      Aggregated bookings, tickets and revenue rolled up from
      theatre and movie level to city level.
    </CardDescription>
  </CardHeader>

  <CardContent>
  <div className="space-y-8">

    {/* CITY REVENUE CHART */}
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...olapRollup].sort(
            (a, b) =>
              b.total_revenue - a.total_revenue
          )}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            opacity={0.2}
          />

          <XAxis
            dataKey="city"
          />

          <YAxis
            tickFormatter={(value) => `₹${value}`}
          />

          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined
                ? [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Revenue",
                  ]
                : []
            }
          />

          <Legend />

          <Bar
            dataKey="total_revenue"
            name="City Revenue"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* EXISTING TABLE */}
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>City</TableHead>
            <TableHead>Total Bookings</TableHead>
            <TableHead>Total Tickets</TableHead>
            <TableHead>Total Revenue</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {[...olapRollup]
            .sort(
              (a, b) =>
                b.total_revenue - a.total_revenue
            )
            .map((city) => (
              <TableRow key={city.city}>
                <TableCell className="font-medium">
                  {city.city}
                </TableCell>

                <TableCell>
                  {city.total_bookings}
                </TableCell>

                <TableCell>
                  {city.total_tickets}
                </TableCell>

                <TableCell>
                  {inr(city.total_revenue)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>

  </div>
</CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>OLAP Slice — City</CardTitle>

    <CardDescription>
      Select one city to view only its bookings, tickets and revenue.
    </CardDescription>
  </CardHeader>

  <CardContent>
  {/* CITY FILTER BUTTONS */}
  <div className="mb-6 flex flex-wrap gap-2">
    <Button
      variant={sliceCity === null ? "default" : "outline"}
      onClick={() => setSliceCity(null)}
    >
      All Cities
    </Button>

    {Array.from(
      new Set(olapData.map((item) => item.city))
    ).map((city) => (
      <Button
        key={city}
        variant={sliceCity === city ? "default" : "outline"}
        onClick={() => setSliceCity(city)}
      >
        {city}
      </Button>
    ))}
  </div>

  {/* SLICE REVENUE CHART */}
  <div className="mb-8 h-[350px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={Array.from(
          new Set(
            olapData
              .filter(
                (item) =>
                  sliceCity === null ||
                  item.city === sliceCity
              )
              .map((item) => item.city)
          )
        ).map((city) => {
          const cityData = olapData.filter(
            (item) => item.city === city
          );

          return {
            city,
            total_revenue: cityData.reduce(
              (sum, item) =>
                sum + Number(item.total_revenue),
              0
            ),
          };
        })}
        margin={{
          top: 10,
          right: 30,
          left: 20,
          bottom: 20,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          opacity={0.2}
        />

        <XAxis dataKey="city" />

        <YAxis
          tickFormatter={(value) => `₹${value}`}
        />

        <Tooltip
          formatter={(value: number | undefined) =>
            value !== undefined
              ? [
                  `₹${value.toLocaleString("en-IN")}`,
                  "Revenue",
                ]
              : []
          }
        />

        <Legend />

        <Bar
          dataKey="total_revenue"
          name="City Revenue"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* EXISTING TABLE */}
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>City</TableHead>
          <TableHead>Movie</TableHead>
          <TableHead>Bookings</TableHead>
          <TableHead>Tickets</TableHead>
          <TableHead>Revenue</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {olapData
          .filter(
            (item) =>
              sliceCity === null ||
              item.city === sliceCity
          )
          .map((item, index) => (
            <TableRow
              key={`${item.city}-${item.theatre_name}-${item.movie_title}-${index}`}
            >
              <TableCell>
                {item.city}
              </TableCell>

              <TableCell className="font-medium">
                {item.movie_title}
              </TableCell>

              <TableCell>
                {item.total_bookings}
              </TableCell>

              <TableCell>
                {item.total_tickets}
              </TableCell>

              <TableCell>
                {inr(item.total_revenue)}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  </div>
</CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>OLAP Dice — City + Movie</CardTitle>

    <CardDescription>
      Select multiple cities and movies to analyze a smaller
      multidimensional subset of the data.
    </CardDescription>
  </CardHeader>

  <CardContent>
  <div className="space-y-8">

    {/* CITY SELECTION */}
    <div>
      <h3 className="mb-3 font-semibold">
        Select Cities
      </h3>

      <div className="flex flex-wrap gap-2">
        {Array.from(
          new Set(olapData.map((item) => item.city))
        ).map((city) => {
          const selected = diceCities.includes(city);

          return (
            <Button
              key={city}
              variant={selected ? "default" : "outline"}
              onClick={() => {
                setDiceCities((current) =>
                  selected
                    ? current.filter((item) => item !== city)
                    : [...current, city]
                );
              }}
            >
              {city}
            </Button>
          );
        })}
      </div>
    </div>

    {/* MOVIE SELECTION */}
    <div>
      <h3 className="mb-3 font-semibold">
        Select Movies
      </h3>

      <div className="flex flex-wrap gap-2">
        {Array.from(
          new Set(olapData.map((item) => item.movie_title))
        ).map((movie) => {
          const selected = diceMovies.includes(movie);

          return (
            <Button
              key={movie}
              variant={selected ? "default" : "outline"}
              onClick={() => {
                setDiceMovies((current) =>
                  selected
                    ? current.filter((item) => item !== movie)
                    : [...current, movie]
                );
              }}
            >
              {movie}
            </Button>
          );
        })}
      </div>
    </div>

    {/* CLEAR SELECTION */}
    <Button
      variant="outline"
      onClick={() => {
        setDiceCities([]);
        setDiceMovies([]);
      }}
    >
      Clear Selection
    </Button>

    {/* DICE REVENUE CHART */}
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={olapData
            .filter((item) => {
              const cityMatch =
                diceCities.length === 0 ||
                diceCities.includes(item.city);

              const movieMatch =
                diceMovies.length === 0 ||
                diceMovies.includes(item.movie_title);

              return cityMatch && movieMatch;
            })
            .reduce(
              (acc, item) => {
                const key = `${item.city} - ${item.movie_title}`;

                const existing = acc.find(
                  (row) => row.name === key
                );

                if (existing) {
                  existing.revenue += Number(item.total_revenue);
                } else {
                  acc.push({
                    name: key,
                    revenue: Number(item.total_revenue),
                  });
                }

                return acc;
              },
              [] as { name: string; revenue: number }[]
            )}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 100,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            opacity={0.2}
          />

          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={120}
            tick={{ fontSize: 11 }}
          />

          <YAxis
            tickFormatter={(value) => `₹${value}`}
          />

          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined
                ? [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Revenue",
                  ]
                : []
            }
          />

          <Legend />

          <Bar
            dataKey="revenue"
            name="Dice Revenue"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* DICE RESULT TABLE */}
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>City</TableHead>
            <TableHead>Movie</TableHead>
            <TableHead>Bookings</TableHead>
            <TableHead>Tickets</TableHead>
            <TableHead>Revenue</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {olapData
            .filter((item) => {
              const cityMatch =
                diceCities.length === 0 ||
                diceCities.includes(item.city);

              const movieMatch =
                diceMovies.length === 0 ||
                diceMovies.includes(item.movie_title);

              return cityMatch && movieMatch;
            })
            .map((item, index) => (
              <TableRow
                key={`${item.city}-${item.theatre_name}-${item.movie_title}-${index}`}
              >
                <TableCell>
                  {item.city}
                </TableCell>

                <TableCell className="font-medium">
                  {item.movie_title}
                </TableCell>

                <TableCell>
                  {item.total_bookings}
                </TableCell>

                <TableCell>
                  {item.total_tickets}
                </TableCell>

                <TableCell>
                  {inr(Number(item.total_revenue))}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>

  </div>
</CardContent>
</Card>
<Card>
  <CardHeader>
    <CardTitle>OLAP Pivot — City × Movie Revenue</CardTitle>
    <CardDescription>
      Pivot the revenue data to compare movies across cities.
    </CardDescription>
  </CardHeader>

  <CardContent>
  <div className="space-y-8">

    {/* CITY FILTER */}
    <div>
      <h3 className="mb-3 font-semibold">
        Select City
      </h3>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={pivotCity === null ? "default" : "outline"}
          onClick={() => setPivotCity(null)}
        >
          All Cities
        </Button>

        {Array.from(
          new Set(olapData.map((item) => item.city))
        ).map((city) => (
          <Button
            key={city}
            variant={pivotCity === city ? "default" : "outline"}
            onClick={() => setPivotCity(city)}
          >
            {city}
          </Button>
        ))}
      </div>
    </div>

    {/* PIVOT REVENUE CHART */}
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={Array.from(
            new Set(
              olapData
                .filter(
                  (item) =>
                    pivotCity === null ||
                    item.city === pivotCity
                )
                .map((item) => item.city)
            )
          ).map((city) => {
            const row: Record<string, string | number> = {
              city,
            };

            Array.from(
              new Set(
                olapData.map(
                  (item) => item.movie_title
                )
              )
            ).forEach((movie) => {
              row[movie] = olapData
                .filter(
                  (item) =>
                    item.city === city &&
                    item.movie_title === movie
                )
                .reduce(
                  (sum, item) =>
                    sum + Number(item.total_revenue),
                  0
                );
            });

            return row;
          })}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            opacity={0.2}
          />

          <XAxis dataKey="city" />

          <YAxis
            tickFormatter={(value) => `₹${value}`}
          />

          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined
                ? [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Revenue",
                  ]
                : []
            }
          />

          <Legend />

          {Array.from(
            new Set(
              olapData.map(
                (item) => item.movie_title
              )
            )
          ).map((movie) => (
            <Bar
              key={movie}
              dataKey={movie}
              stackId="revenue"
              name={movie}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* PIVOT TABLE */}
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>City</TableHead>

            {Array.from(
              new Set(
                olapData.map(
                  (item) => item.movie_title
                )
              )
            ).map((movie) => (
              <TableHead key={movie}>
                {movie}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {Array.from(
            new Set(
              olapData
                .filter(
                  (item) =>
                    pivotCity === null ||
                    item.city === pivotCity
                )
                .map((item) => item.city)
            )
          ).map((city) => (
            <TableRow key={city}>
              <TableCell className="font-medium">
                {city}
              </TableCell>

              {Array.from(
                new Set(
                  olapData.map(
                    (item) => item.movie_title
                  )
                )
              ).map((movie) => {
                const revenue = olapData
                  .filter(
                    (item) =>
                      item.city === city &&
                      item.movie_title === movie
                  )
                  .reduce(
                    (sum, item) =>
                      sum + Number(item.total_revenue),
                    0
                  );

                return (
                  <TableCell key={movie}>
                    {revenue > 0 ? inr(revenue) : "—"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

  </div>
</CardContent>
</Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="text-primary-glow">{icon}</span>
        {label}
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>

      <p className="mt-1 text-xs text-muted-foreground">
        From data warehouse
      </p>
    </div>
  );
}