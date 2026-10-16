
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon;

-- Tighten the seat update policy
DROP POLICY IF EXISTS "show_seats_lock_authenticated" ON public.show_seats;
CREATE POLICY "show_seats_update_owner_or_free" ON public.show_seats FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')
    OR status = 'available'
    OR (status = 'locked' AND locked_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')
    OR locked_by = auth.uid()
    OR status = 'available'
  );
