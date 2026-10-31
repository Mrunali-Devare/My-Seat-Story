// Browser-only storage for the demo's per-user data (bookings, profiles, reviews).
// Movies, shows and seat maps are still read from Supabase; anything a user creates lives here.

export type LocalBookingSeat = { id: string; seat_label: string; price: number };

export type LocalBooking = {
  id: string;
  booking_code: string;
  user_id: string;
  show_id: string;
  total_amount: number;
  status: "confirmed" | "cancelled";
  payment_status: "success" | "refunded";
  created_at: string;
  seats: LocalBookingSeat[];
  show: {
    start_time: string;
    screen_name: string | null;
    theater: { name: string; city: string; address: string | null } | null;
    movie: {
      id: string | null;
      title: string;
      poster_url: string | null;
      duration_minutes: number | null;
      certificate: string | null;
    } | null;
  };
};

export type LocalProfile = { full_name: string; phone: string; city: string };

export type LocalReview = {
  id: string;
  movie_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const BOOKINGS_KEY = "mss-demo-bookings";
const PROFILES_KEY = "mss-demo-profiles";
const REVIEWS_KEY = "mss-demo-reviews";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const newBookingCode = () => `MSS${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// ---- Bookings ----

const allBookings = () => read<LocalBooking[]>(BOOKINGS_KEY, []);

/** Confirmed bookings from every demo user in this browser (for the manager dashboard). */
export function getConfirmedBookings(): LocalBooking[] {
  return allBookings().filter((b) => b.status === "confirmed");
}

export function getUserBookings(userId: string): LocalBooking[] {
  return allBookings()
    .filter((b) => b.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getBooking(id: string): LocalBooking | null {
  return allBookings().find((b) => b.id === id) ?? null;
}

/** Seat ids taken by any confirmed local booking for this show (across all demo users). */
export function getBookedSeatIds(showId: string): Set<string> {
  const ids = new Set<string>();
  for (const b of allBookings()) {
    if (b.show_id === showId && b.status === "confirmed") for (const s of b.seats) ids.add(s.id);
  }
  return ids;
}

export function createBooking(
  input: Pick<LocalBooking, "user_id" | "show_id" | "total_amount" | "seats" | "show">,
): LocalBooking {
  const booking: LocalBooking = {
    ...input,
    id: newId(),
    booking_code: newBookingCode(),
    status: "confirmed",
    payment_status: "success",
    created_at: new Date().toISOString(),
  };
  write(BOOKINGS_KEY, [...allBookings(), booking]);
  return booking;
}

/** Cancels a booking; its seats become available again. */
export function cancelBooking(id: string) {
  write(
    BOOKINGS_KEY,
    allBookings().map((b) =>
      b.id === id ? { ...b, status: "cancelled" as const, payment_status: "refunded" as const } : b,
    ),
  );
}

// ---- Profiles ----

export function getProfile(userId: string): LocalProfile | null {
  return read<Record<string, LocalProfile>>(PROFILES_KEY, {})[userId] ?? null;
}

export function saveProfile(userId: string, profile: LocalProfile) {
  write(PROFILES_KEY, { ...read<Record<string, LocalProfile>>(PROFILES_KEY, {}), [userId]: profile });
}

// ---- Reviews ----

export function getMovieReviews(movieId: string): LocalReview[] {
  return read<LocalReview[]>(REVIEWS_KEY, []).filter((r) => r.movie_id === movieId);
}

/** One review per user per movie: submitting again replaces the earlier one. */
export function saveReview(input: Omit<LocalReview, "id" | "created_at">) {
  const others = read<LocalReview[]>(REVIEWS_KEY, []).filter(
    (r) => !(r.movie_id === input.movie_id && r.user_id === input.user_id),
  );
  write(REVIEWS_KEY, [...others, { ...input, id: newId(), created_at: new Date().toISOString() }]);
}
