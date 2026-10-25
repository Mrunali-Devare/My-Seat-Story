
CREATE OR REPLACE FUNCTION public.confirm_mock_booking(
  p_show_id UUID,
  p_seat_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_booking_id UUID;
  v_seat_count INTEGER;
  v_total NUMERIC(10,2);
BEGIN
  -- Require a signed-in user and a valid seat selection.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to book seats';
  END IF;

  IF p_seat_ids IS NULL
     OR cardinality(p_seat_ids) < 1
     OR cardinality(p_seat_ids) > 10 THEN
    RAISE EXCEPTION 'Select between 1 and 10 seats';
  END IF;

  -- Lock the requested rows to prevent simultaneous booking races.
  PERFORM s.id
  FROM public.show_seats AS s
  WHERE s.show_id = p_show_id
    AND s.id = ANY(p_seat_ids)
  ORDER BY s.id
  FOR UPDATE;

  -- Every requested seat must still be held by this user
  -- and its hold must not have expired.
  SELECT COUNT(*)::INTEGER, COALESCE(SUM(s.price), 0)
  INTO v_seat_count, v_total
  FROM public.show_seats AS s
  WHERE s.show_id = p_show_id
    AND s.id = ANY(p_seat_ids)
    AND s.status = 'locked'
    AND s.locked_by = v_user_id
    AND s.locked_until > now();

  IF v_seat_count <> cardinality(p_seat_ids) THEN
    RAISE EXCEPTION
      'One or more seat holds expired or are no longer yours. Please select seats again.';
  END IF;

  -- This is a simulated payment, not a real payment gateway.
  INSERT INTO public.bookings (
    user_id,
    show_id,
    total_amount,
    status,
    payment_status
  )
  VALUES (
    v_user_id,
    p_show_id,
    v_total,
    'confirmed',
    'success'
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_seats (
    booking_id,
    show_seat_id,
    seat_label,
    price
  )
  SELECT
    v_booking_id,
    s.id,
    s.seat_label,
    s.price
  FROM public.show_seats AS s
  WHERE s.show_id = p_show_id
    AND s.id = ANY(p_seat_ids)
    AND s.status = 'locked'
    AND s.locked_by = v_user_id
    AND s.locked_until > now();

  UPDATE public.show_seats AS s
  SET status = 'booked',
      booking_id = v_booking_id,
      locked_by = NULL,
      locked_until = NULL
  WHERE s.show_id = p_show_id
    AND s.id = ANY(p_seat_ids)
    AND s.status = 'locked'
    AND s.locked_by = v_user_id
    AND s.locked_until > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not confirm the selected seats';
  END IF;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_mock_booking(UUID, UUID[])
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.confirm_mock_booking(UUID, UUID[])
  TO authenticated;
