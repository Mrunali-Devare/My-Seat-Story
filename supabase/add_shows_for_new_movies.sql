-- Gives every movie that has no showtimes two shows over the next 3 days, spread across
-- all screens (so they appear in every city). Run once in the Supabase SQL Editor.
DO $$
DECLARE
  v_screens UUID[];
  v_n INT;
  v_i INT := 0;
  m RECORD;
BEGIN
  SELECT array_agg(id ORDER BY created_at, id) INTO v_screens FROM public.screens;
  v_n := COALESCE(array_length(v_screens, 1), 0);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No screens found. Add theatres and screens first.';
  END IF;

  FOR m IN
    SELECT id FROM public.movies
    WHERE NOT EXISTS (SELECT 1 FROM public.shows s WHERE s.movie_id = movies.id)
    ORDER BY rating DESC
  LOOP
    v_i := v_i + 1;
    PERFORM public.seed_show_with_seats(
      v_screens[1 + (v_i % v_n)], m.id,
      ((current_date + 1)::timestamp + make_interval(hours => 14 + (v_i % 4) * 2)) AT TIME ZONE 'Asia/Kolkata',
      250);
    PERFORM public.seed_show_with_seats(
      v_screens[1 + ((v_i + 3) % v_n)], m.id,
      ((current_date + 2)::timestamp + make_interval(hours => 18 + (v_i % 3), mins => 30)) AT TIME ZONE 'Asia/Kolkata',
      250);
  END LOOP;
END $$;
