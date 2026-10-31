-- Demo accounts skip email confirmation so "Demo user" / "Demo manager" always sign in.
CREATE OR REPLACE FUNCTION public.autoconfirm_demo_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IN ('demo@cineverse.app', 'manager@cineverse.app') THEN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS autoconfirm_demo_users ON auth.users;
CREATE TRIGGER autoconfirm_demo_users BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.autoconfirm_demo_users();

-- Confirm any demo accounts that already exist.
UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email IN ('demo@cineverse.app', 'manager@cineverse.app');
