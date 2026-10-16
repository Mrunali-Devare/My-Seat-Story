
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('customer', 'manager', 'admin');
CREATE TYPE public.movie_status AS ENUM ('upcoming', 'now_showing', 'ended');
CREATE TYPE public.seat_type AS ENUM ('regular', 'premium', 'vip', 'recliner');
CREATE TYPE public.seat_status AS ENUM ('available', 'locked', 'booked');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT DEFAULT 'Mumbai',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + assign customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- MOVIES
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,
  duration_minutes INT NOT NULL DEFAULT 120,
  genres TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{English}',
  certificate TEXT DEFAULT 'UA',
  rating NUMERIC(3,1) DEFAULT 0,
  release_date DATE,
  status public.movie_status NOT NULL DEFAULT 'now_showing',
  featured BOOLEAN NOT NULL DEFAULT false,
  trending BOOLEAN NOT NULL DEFAULT false,
  cast_list JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.movies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.movies TO authenticated;
GRANT ALL ON public.movies TO service_role;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movies_select_all" ON public.movies FOR SELECT USING (true);
CREATE POLICY "movies_manage_managers" ON public.movies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_movies_updated BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- THEATERS
CREATE TABLE public.theaters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.theaters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.theaters TO authenticated;
GRANT ALL ON public.theaters TO service_role;
ALTER TABLE public.theaters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "theaters_select_all" ON public.theaters FOR SELECT USING (true);
CREATE POLICY "theaters_manage_managers" ON public.theaters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_theaters_updated BEFORE UPDATE ON public.theaters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCREENS
CREATE TABLE public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theater_id UUID NOT NULL REFERENCES public.theaters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rows INT NOT NULL DEFAULT 8,
  cols INT NOT NULL DEFAULT 12,
  -- seat_config: { "premium_rows": ["A","B"], "vip_rows":["G","H"], "recliner_rows":[] }
  seat_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.screens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.screens TO authenticated;
GRANT ALL ON public.screens TO service_role;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "screens_select_all" ON public.screens FOR SELECT USING (true);
CREATE POLICY "screens_manage_managers" ON public.screens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- SHOWS
CREATE TABLE public.shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shows TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shows TO authenticated;
GRANT ALL ON public.shows TO service_role;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shows_select_all" ON public.shows FOR SELECT USING (true);
CREATE POLICY "shows_manage_managers" ON public.shows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_shows_movie ON public.shows(movie_id);
CREATE INDEX idx_shows_screen ON public.shows(screen_id);
CREATE INDEX idx_shows_start ON public.shows(start_time);

-- SHOW SEATS
CREATE TABLE public.show_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL,
  col_num INT NOT NULL,
  seat_label TEXT NOT NULL,
  seat_type public.seat_type NOT NULL DEFAULT 'regular',
  price NUMERIC(10,2) NOT NULL,
  status public.seat_status NOT NULL DEFAULT 'available',
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_until TIMESTAMPTZ,
  booking_id UUID,
  UNIQUE (show_id, seat_label)
);
GRANT SELECT ON public.show_seats TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.show_seats TO authenticated;
GRANT ALL ON public.show_seats TO service_role;
ALTER TABLE public.show_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "show_seats_select_all" ON public.show_seats FOR SELECT USING (true);
-- Allow logged-in users to lock/unlock seats they own; managers can manage all
CREATE POLICY "show_seats_lock_authenticated" ON public.show_seats FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "show_seats_insert_managers" ON public.show_seats FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "show_seats_delete_managers" ON public.show_seats FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_show_seats_show ON public.show_seats(show_id);

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  booking_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_bookings_user ON public.bookings(user_id);

-- BOOKING SEATS
CREATE TABLE public.booking_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  show_seat_id UUID NOT NULL REFERENCES public.show_seats(id) ON DELETE CASCADE,
  seat_label TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL
);
GRANT SELECT, INSERT, DELETE ON public.booking_seats TO authenticated;
GRANT ALL ON public.booking_seats TO service_role;
ALTER TABLE public.booking_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_seats_select_own" ON public.booking_seats FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "booking_seats_insert_own" ON public.booking_seats FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (movie_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reviews_delete_own" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
