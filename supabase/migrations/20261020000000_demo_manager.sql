-- Lets the shared demo manager account (and only it) grant itself the manager role.
-- user_roles has no INSERT policy for clients, so this runs as SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.ensure_demo_manager()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'manager@cineverse.app' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'manager') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_demo_manager() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_demo_manager() TO authenticated;
