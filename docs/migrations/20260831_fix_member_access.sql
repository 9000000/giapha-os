-- Security fix: new users must be approved before they can read family data.
-- Existing member accounts are disabled below so the fix fails closed; an admin
-- can approve legitimate accounts from the user-management screen.

UPDATE public.profiles
SET is_active = false, updated_at = NOW()
WHERE role = 'member' AND is_active = true;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'editor' AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_editor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT count(*) = 1 FROM auth.users INTO is_first_user;

  INSERT INTO public.profiles (id, role, is_active)
  VALUES (
    NEW.id,
    CASE WHEN is_first_user THEN 'admin'::public.user_role_enum ELSE 'member'::public.user_role_enum END,
    is_first_user
  );

  RETURN NEW;
END;
$$;

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.persons;
DROP POLICY IF EXISTS "Active users can view persons" ON public.persons;
CREATE POLICY "Active users can view persons"
ON public.persons FOR SELECT TO authenticated
USING (public.is_active_user());

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.relationships;
DROP POLICY IF EXISTS "Active users can view relationships" ON public.relationships;
CREATE POLICY "Active users can view relationships"
ON public.relationships FOR SELECT TO authenticated
USING (public.is_active_user());

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can view custom events" ON public.custom_events;
CREATE POLICY "Active users can view custom events"
ON public.custom_events FOR SELECT TO authenticated
USING (public.is_active_user());

DROP POLICY IF EXISTS "Authenticated users can insert custom events" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can insert custom events" ON public.custom_events;
CREATE POLICY "Active users can insert custom events"
ON public.custom_events FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own custom events" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can update own custom events" ON public.custom_events;
CREATE POLICY "Active users can update own custom events"
ON public.custom_events FOR UPDATE TO authenticated
USING (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()))
WITH CHECK (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()));

DROP POLICY IF EXISTS "Users can delete own custom events" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can delete own custom events" ON public.custom_events;
CREATE POLICY "Active users can delete own custom events"
ON public.custom_events FOR DELETE TO authenticated
USING (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()));

DO $$
BEGIN
  IF to_regclass('public.gallery_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.gallery_items;
    DROP POLICY IF EXISTS "Active users can view gallery" ON public.gallery_items;
    CREATE POLICY "Active users can view gallery"
    ON public.gallery_items FOR SELECT TO authenticated
    USING (public.is_active_user());

    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.gallery_items;
    DROP POLICY IF EXISTS "Active users can insert gallery" ON public.gallery_items;
    CREATE POLICY "Active users can insert gallery"
    ON public.gallery_items FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user() AND auth.uid() = created_by);

    DROP POLICY IF EXISTS "Enable update for admin and owner" ON public.gallery_items;
    DROP POLICY IF EXISTS "Active users can update gallery" ON public.gallery_items;
    CREATE POLICY "Active users can update gallery"
    ON public.gallery_items FOR UPDATE TO authenticated
    USING (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()))
    WITH CHECK (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()));

    DROP POLICY IF EXISTS "Enable delete for admin and owner" ON public.gallery_items;
    DROP POLICY IF EXISTS "Active users can delete gallery" ON public.gallery_items;
    CREATE POLICY "Active users can delete gallery"
    ON public.gallery_items FOR DELETE TO authenticated
    USING (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()));
  END IF;
END;
$$;

-- Gallery objects must not remain publicly readable after the table is protected.
UPDATE storage.buckets SET public = false WHERE id = 'gallery';

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Active users can view gallery files" ON storage.objects;
CREATE POLICY "Active users can view gallery files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'gallery' AND public.is_active_user());

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Active users can upload gallery files" ON storage.objects;
CREATE POLICY "Active users can upload gallery files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery' AND public.is_active_user());

DROP POLICY IF EXISTS "Admin and owner can update" ON storage.objects;
DROP POLICY IF EXISTS "Active users can update gallery files" ON storage.objects;
CREATE POLICY "Active users can update gallery files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery' AND public.is_active_user() AND (auth.uid() = owner OR public.is_admin()))
WITH CHECK (bucket_id = 'gallery' AND public.is_active_user() AND (auth.uid() = owner OR public.is_admin()));

DROP POLICY IF EXISTS "Admin and owner can delete" ON storage.objects;
DROP POLICY IF EXISTS "Active users can delete gallery files" ON storage.objects;
CREATE POLICY "Active users can delete gallery files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery' AND public.is_active_user() AND (auth.uid() = owner OR public.is_admin()));
