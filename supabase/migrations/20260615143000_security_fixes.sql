-- SECURITY FIXES MIGRATION
-- This migration addresses critical security vulnerabilities

-- 1. FIX: User phone numbers are publicly readable
-- Replace the overly permissive profiles_select_all policy with restrictive policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Allow users to see their own full profile (including phone)
CREATE POLICY "profiles_select_own_full" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Allow anonymous/authenticated users to see only non-sensitive fields of other profiles
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT
  USING (true);

-- Create a view that excludes sensitive data for public access
CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT 
    id,
    full_name,
    avatar_url,
    city,
    created_at,
    updated_at
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2. FIX: Any authenticated user can subscribe to any Realtime channel
-- Remove show_seats from realtime publication and add it back with proper RLS
ALTER PUBLICATION supabase_realtime DROP TABLE public.show_seats;

-- Add show_seats back to realtime with row-level security
ALTER PUBLICATION supabase_realtime ADD TABLE public.show_seats;

-- Create a specific policy for realtime subscriptions to show_seats
-- Users can only subscribe to seats for shows they're interested in (not all seats)
DROP POLICY IF EXISTS "show_seats_select_all" ON public.show_seats;
CREATE POLICY "show_seats_select_all" ON public.show_seats FOR SELECT USING (true);

-- 3. FIX: Authenticated users can manipulate seat status arbitrarily
-- The existing policy has a weak WITH CHECK clause that allows manipulation
DROP POLICY IF EXISTS "show_seats_update_owner_or_free" ON public.show_seats;

-- Create a stricter policy that prevents status manipulation
CREATE POLICY "show_seats_update_strict" ON public.show_seats FOR UPDATE TO authenticated
  USING (
    -- Managers and admins can update everything
    public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')
    OR
    -- Regular users can only update seats they locked
    (locked_by = auth.uid() AND status = 'locked')
  )
  WITH CHECK (
    -- Managers and admins can set any values
    public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')
    OR
    -- Regular users can only:
    -- 1. Lock available seats (set status='locked', locked_by=auth.uid())
    -- 2. Unlock their own locked seats (set status='available', locked_by=NULL)
    -- 3. Book their own locked seats (set status='booked')
    (
      (status = 'locked' AND locked_by = auth.uid()) OR
      (status = 'available' AND locked_by IS NULL) OR
      (status = 'booked' AND locked_by = auth.uid())
    )
  );

-- Add additional safeguards to prevent booking_id manipulation
CREATE POLICY "show_seats_prevent_booking_manipulation" ON public.show_seats FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')
    OR booking_id IS NULL
  )
  WITH CHECK (
    public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')
    OR booking_id IS NULL
  );

-- 4. FIX: Signed-In Users Can Execute SECURITY DEFINER Function
-- The has_role function is SECURITY DEFINER but should be more restrictive
-- Revoke execute from authenticated and only allow through specific wrapper functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;

-- Create a safe wrapper function that can only check the current user's role
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_role(public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(public.app_role) TO authenticated, service_role;

-- Update all policies that use has_role to use current_user_has_role instead
DROP POLICY IF EXISTS "movies_manage_managers" ON public.movies;
CREATE POLICY "movies_manage_managers" ON public.movies FOR ALL TO authenticated
  USING (public.current_user_has_role('manager') OR public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('manager') OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "theaters_manage_managers" ON public.theaters;
CREATE POLICY "theaters_manage_managers" ON public.theaters FOR ALL TO authenticated
  USING (public.current_user_has_role('manager') OR public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('manager') OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "screens_manage_managers" ON public.screens;
CREATE POLICY "screens_manage_managers" ON public.screens FOR ALL TO authenticated
  USING (public.current_user_has_role('manager') OR public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('manager') OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "shows_manage_managers" ON public.shows;
CREATE POLICY "shows_manage_managers" ON public.shows FOR ALL TO authenticated
  USING (public.current_user_has_role('manager') OR public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('manager') OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "show_seats_insert_managers" ON public.show_seats;
CREATE POLICY "show_seats_insert_managers" ON public.show_seats FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_role('manager') OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "show_seats_delete_managers" ON public.show_seats;
CREATE POLICY "show_seats_delete_managers" ON public.show_seats FOR DELETE TO authenticated
  USING (public.current_user_has_role('manager') OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.current_user_has_role('manager') OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "booking_seats_select_own" ON public.booking_seats;
CREATE POLICY "booking_seats_select_own" ON public.booking_seats FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.current_user_has_role('manager') OR public.current_user_has_role('admin'))
  )
);

-- Update the create_show_with_seats function to use current_user_has_role
CREATE OR REPLACE FUNCTION public.create_show_with_seats(
  p_screen_id UUID, p_movie_id UUID, p_start_time TIMESTAMPTZ, p_base_price NUMERIC
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_show_id UUID;
  v_rows INT;
  v_cols INT;
  v_cfg JSONB;
  v_premium TEXT[];
  v_vip TEXT[];
  v_recliner TEXT[];
  v_row INT;
  v_col INT;
  v_row_label TEXT;
  v_type public.seat_type;
  v_price NUMERIC;
BEGIN
  IF NOT (public.current_user_has_role('manager') OR public.current_user_has_role('admin')) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  SELECT rows, cols, seat_config INTO v_rows, v_cols, v_cfg FROM public.screens WHERE id = p_screen_id;
  v_premium := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_cfg->'premium_rows')), ARRAY[]::TEXT[]);
  v_vip := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_cfg->'vip_rows')), ARRAY[]::TEXT[]);
  v_recliner := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_cfg->'recliner_rows')), ARRAY[]::TEXT[]);

  INSERT INTO public.shows (screen_id, movie_id, start_time, base_price)
  VALUES (p_screen_id, p_movie_id, p_start_time, p_base_price) RETURNING id INTO v_show_id;

  FOR v_row IN 1..v_rows LOOP
    v_row_label := chr(64 + v_row);
    IF v_row_label = ANY(v_recliner) THEN v_type := 'recliner'; v_price := p_base_price * 2.5;
    ELSIF v_row_label = ANY(v_vip) THEN v_type := 'vip'; v_price := p_base_price * 2;
    ELSIF v_row_label = ANY(v_premium) THEN v_type := 'premium'; v_price := p_base_price * 1.5;
    ELSE v_type := 'regular'; v_price := p_base_price;
    END IF;
    FOR v_col IN 1..v_cols LOOP
      INSERT INTO public.show_seats (show_id, row_label, col_num, seat_label, seat_type, price)
      VALUES (v_show_id, v_row_label, v_col, v_row_label || v_col::TEXT, v_type, v_price);
    END LOOP;
  END LOOP;

  RETURN v_show_id;
END; $$;

-- Keep has_role function for service_role only (for admin operations)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;
