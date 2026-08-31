-- User approval workflow: newly registered users stay pending after email confirmation.
-- Run this migration after 20260831_fix_member_access.sql on existing projects.

ALTER TABLE public.profiles
  ALTER COLUMN is_active SET DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_approval_requests_expires_at
  ON public.user_approval_requests(expires_at);

ALTER TABLE public.user_approval_requests ENABLE ROW LEVEL SECURITY;

-- Keep this table inaccessible to browser clients. The server-only service-role
-- client is used by the notification and approval routes.
DROP POLICY IF EXISTS "No client access to approval requests"
  ON public.user_approval_requests;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- The first account becomes the initial admin; every later account is pending.
  SELECT count(*) = 1 FROM auth.users INTO is_first_user;

  INSERT INTO public.profiles (id, role, is_active)
  VALUES (
    NEW.id,
    CASE WHEN is_first_user THEN 'admin'::public.user_role_enum ELSE 'member'::public.user_role_enum END,
    CASE WHEN is_first_user THEN true ELSE false END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

