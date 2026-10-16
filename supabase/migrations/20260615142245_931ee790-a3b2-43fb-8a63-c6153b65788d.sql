
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
  IF NOT (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  SELECT rows, cols, seat_config INTO v_rows, v_cols, v_cfg FROM public.screens WHERE id = p_screen_id;
  v_premium := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_cfg->'premium_rows')), ARRAY[]::TEXT[]);
  v_vip := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_cfg->'vip_rows')), ARRAY[]::TEXT[]);
  v_recliner := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_cfg->'recliner_rows')), ARRAY[]::TEXT[]);

  INSERT INTO public.shows (screen_id, movie_id, start_time, base_price)
  VALUES (p_screen_id, p_movie_id, p_start_time, p_base_price) RETURNING id INTO v_show_id;

  FOR v_row IN 1..v_rows LOOP
    v_row_label := chr(64 + v_row); -- A,B,C,...
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

REVOKE EXECUTE ON FUNCTION public.create_show_with_seats(UUID, UUID, TIMESTAMPTZ, NUMERIC) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_show_with_seats(UUID, UUID, TIMESTAMPTZ, NUMERIC) TO authenticated, service_role;

-- Seed-only helper (service_role only) to pre-create shows without role checks
CREATE OR REPLACE FUNCTION public.seed_show_with_seats(
  p_screen_id UUID, p_movie_id UUID, p_start_time TIMESTAMPTZ, p_base_price NUMERIC
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_show_id UUID; v_rows INT; v_cols INT; v_cfg JSONB;
  v_premium TEXT[]; v_vip TEXT[]; v_recliner TEXT[];
  v_row INT; v_col INT; v_row_label TEXT; v_type public.seat_type; v_price NUMERIC;
BEGIN
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
REVOKE EXECUTE ON FUNCTION public.seed_show_with_seats(UUID, UUID, TIMESTAMPTZ, NUMERIC) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_show_with_seats(UUID, UUID, TIMESTAMPTZ, NUMERIC) TO service_role;
