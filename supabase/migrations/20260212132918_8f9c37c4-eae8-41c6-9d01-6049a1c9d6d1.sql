
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure this is only called as an INSERT trigger on auth.users
  IF TG_OP != 'INSERT' THEN
    RAISE EXCEPTION 'handle_new_user can only be called on INSERT';
  END IF;

  IF TG_TABLE_SCHEMA != 'auth' OR TG_TABLE_NAME != 'users' THEN
    RAISE EXCEPTION 'handle_new_user can only be called from auth.users';
  END IF;

  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
