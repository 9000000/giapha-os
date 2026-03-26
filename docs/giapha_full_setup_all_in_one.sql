-- ==========================================
-- GIAPHA-OS DATABASE — FULL SETUP (ALL-IN-ONE)
-- Version: 2026-03-26
-- ==========================================
-- Hướng dẫn: Mở SQL Editor trên Supabase, dán TOÀN BỘ file này vào và chạy.
-- File này chứa mọi thứ cần thiết để dựng database từ đầu.
-- Đối với dữ liệu mẫu, chạy thêm file seed.sql riêng.
-- ==========================================

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ==========================================
-- 2. ENUMS
-- ==========================================

-- Gender types for family members
DO $$ BEGIN
    CREATE TYPE public.gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Relationship types between family members
DO $$ BEGIN
    CREATE TYPE public.relationship_type_enum AS ENUM ('marriage', 'biological_child', 'adopted_child');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- System user roles
DO $$ BEGIN
    CREATE TYPE public.user_role_enum AS ENUM ('admin', 'editor', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Change request status
DO $$ BEGIN
    CREATE TYPE public.request_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Action type for change requests
DO $$ BEGIN
    CREATE TYPE public.action_type_enum AS ENUM ('insert', 'update', 'delete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 3. UTILITY FUNCTIONS
-- ==========================================

-- Function to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if current user is editor
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'editor'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_editor() FROM public;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;

-- ==========================================
-- 4. TABLES
-- ==========================================

-- PROFILES (Application users linked to Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role public.user_role_enum DEFAULT 'member' NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERSONS (Core entity for family tree)
CREATE TABLE IF NOT EXISTS public.persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender public.gender_enum NOT NULL,
  
  -- Date components (allows for partial dates where only year is known)
  birth_year INT,
  birth_month INT,
  birth_day INT,
  death_year INT,
  death_month INT,
  death_day INT,
  
  is_deceased BOOLEAN NOT NULL DEFAULT FALSE,
  is_in_law BOOLEAN NOT NULL DEFAULT FALSE,
  birth_order INT,
  generation INT,
  other_names TEXT,
  avatar_url TEXT,
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERSON_DETAILS_PRIVATE (Sensitive data with restricted RLS)
CREATE TABLE IF NOT EXISTS public.person_details_private (
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE PRIMARY KEY,
  phone_number TEXT,
  occupation TEXT,
  current_residence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONSHIPS (Links between persons)
CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.relationship_type_enum NOT NULL,
  person_a UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  person_b UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT no_self_relationship CHECK (person_a != person_b),
  UNIQUE(person_a, person_b, type)
);

-- CUSTOM_EVENTS (User-created events)
CREATE TABLE IF NOT EXISTS public.custom_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHANGE_REQUESTS (Pending modifications proposed by editors)
CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action public.action_type_enum NOT NULL,
  target_table TEXT NOT NULL,
  target_record_id UUID,
  old_data JSONB,
  new_data JSONB,
  status public.request_status_enum DEFAULT 'pending' NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid() NOT NULL,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.change_requests IS 'Stores pending modifications (insert, update, delete) proposed by editors that require admin approval.';

-- NOTIFICATION_READS (Persists read state per user)
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_key TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_key)
);

-- ==========================================
-- 5. INDEXES
-- ==========================================

-- Relationship lookups
CREATE INDEX IF NOT EXISTS idx_relationships_person_a ON public.relationships(person_a);
CREATE INDEX IF NOT EXISTS idx_relationships_person_b ON public.relationships(person_b);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON public.relationships(type);

-- Person filtering and sorting
CREATE INDEX IF NOT EXISTS idx_persons_full_name ON public.persons(full_name);
CREATE INDEX IF NOT EXISTS idx_persons_generation ON public.persons(generation);
CREATE INDEX IF NOT EXISTS idx_persons_gender ON public.persons(gender);
CREATE INDEX IF NOT EXISTS idx_persons_is_deceased ON public.persons(is_deceased);
CREATE INDEX IF NOT EXISTS idx_persons_birth_year ON public.persons(birth_year);

-- Profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Custom events lookups
CREATE INDEX IF NOT EXISTS idx_custom_events_date ON public.custom_events(event_date);
CREATE INDEX IF NOT EXISTS idx_custom_events_created_by ON public.custom_events(created_by);

-- Change requests lookups
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON public.change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_requested_by ON public.change_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_change_requests_target_table ON public.change_requests(target_table);

-- Notification reads lookups
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_details_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- PERSONS POLICIES (Admin + Editor can manage)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.persons;
CREATE POLICY "Enable read access for authenticated users" ON public.persons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can update persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can delete persons" ON public.persons;
DROP POLICY IF EXISTS "Admins and Editors can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Admins and Editors can update persons" ON public.persons;
DROP POLICY IF EXISTS "Admins and Editors can delete persons" ON public.persons;

CREATE POLICY "Admins and Editors can insert persons" ON public.persons FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can update persons" ON public.persons FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_editor()) WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can delete persons" ON public.persons FOR DELETE TO authenticated USING (public.is_admin() OR public.is_editor());

-- PERSON_DETAILS_PRIVATE POLICIES
DROP POLICY IF EXISTS "Admins can view private details" ON public.person_details_private;
CREATE POLICY "Admins can view private details" ON public.person_details_private FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage private details" ON public.person_details_private;
CREATE POLICY "Admins can manage private details" ON public.person_details_private FOR ALL TO authenticated USING (public.is_admin());

-- RELATIONSHIPS POLICIES (Admin + Editor can manage)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.relationships;
CREATE POLICY "Enable read access for authenticated users" ON public.relationships FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can insert relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can update relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins and Editors can insert relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins and Editors can update relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins and Editors can delete relationships" ON public.relationships;

CREATE POLICY "Admins and Editors can insert relationships" ON public.relationships FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can update relationships" ON public.relationships FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_editor()) WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can delete relationships" ON public.relationships FOR DELETE TO authenticated USING (public.is_admin() OR public.is_editor());

-- CUSTOM_EVENTS POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.custom_events;
CREATE POLICY "Enable read access for authenticated users" ON public.custom_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert custom events" ON public.custom_events;
CREATE POLICY "Authenticated users can insert custom events" ON public.custom_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own custom events" ON public.custom_events;
CREATE POLICY "Users can update own custom events" ON public.custom_events FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own custom events" ON public.custom_events;
CREATE POLICY "Users can delete own custom events" ON public.custom_events FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin());

-- CHANGE_REQUESTS POLICIES
DROP POLICY IF EXISTS "Admins can manage change requests" ON public.change_requests;
CREATE POLICY "Admins can manage change requests" ON public.change_requests FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Users can read own change requests" ON public.change_requests;
CREATE POLICY "Users can read own change requests" ON public.change_requests FOR SELECT TO authenticated USING (auth.uid() = requested_by);

DROP POLICY IF EXISTS "Editors can insert change requests" ON public.change_requests;
CREATE POLICY "Editors can insert change requests" ON public.change_requests FOR INSERT TO authenticated WITH CHECK (public.is_editor() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own pending change requests" ON public.change_requests;
CREATE POLICY "Users can update own pending change requests" ON public.change_requests FOR UPDATE TO authenticated USING (auth.uid() = requested_by AND status = 'pending');

DROP POLICY IF EXISTS "Users can delete own pending change requests" ON public.change_requests;
CREATE POLICY "Users can delete own pending change requests" ON public.change_requests FOR DELETE TO authenticated USING (auth.uid() = requested_by AND status = 'pending');

-- NOTIFICATION_READS POLICIES
DROP POLICY IF EXISTS "Users can view own reads" ON public.notification_reads;
CREATE POLICY "Users can view own reads" ON public.notification_reads FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reads" ON public.notification_reads;
CREATE POLICY "Users can insert own reads" ON public.notification_reads FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reads" ON public.notification_reads;
CREATE POLICY "Users can delete own reads" ON public.notification_reads FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 7. TRIGGERS
-- ==========================================

-- Updated At Triggers
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_persons_updated_at ON public.persons;
CREATE TRIGGER tr_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_person_details_private_updated_at ON public.person_details_private;
CREATE TRIGGER tr_person_details_private_updated_at BEFORE UPDATE ON public.person_details_private FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_relationships_updated_at ON public.relationships;
CREATE TRIGGER tr_relationships_updated_at BEFORE UPDATE ON public.relationships FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_custom_events_updated_at ON public.custom_events;
CREATE TRIGGER tr_custom_events_updated_at BEFORE UPDATE ON public.custom_events FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_change_requests_updated_at ON public.change_requests;
CREATE TRIGGER tr_change_requests_updated_at BEFORE UPDATE ON public.change_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Handle new user signup (auto-create profile, first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  is_first_user boolean;
BEGIN
  SELECT count(*) = 1 FROM auth.users INTO is_first_user;

  INSERT INTO public.profiles (id, role, is_active)
  VALUES (
    new.id, 
    CASE WHEN is_first_user THEN 'admin'::public.user_role_enum ELSE 'member'::public.user_role_enum END,
    is_first_user
  );

  IF is_first_user THEN
    UPDATE public.profiles 
    SET is_active = true 
    WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$;

-- Auto-confirm first user (skip email verification)
CREATE OR REPLACE FUNCTION public.handle_first_user_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auth
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
    NEW.email_confirmed_at := NOW();
    NEW.last_sign_in_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_first_user_confirmation();

-- ==========================================
-- 8. STORAGE POLICIES
-- ==========================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload avatars." ON storage.objects;
CREATE POLICY "Users can upload avatars." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Users can update avatars." ON storage.objects;
CREATE POLICY "Users can update avatars." ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Users can delete avatars." ON storage.objects;
CREATE POLICY "Users can delete avatars." ON storage.objects FOR DELETE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- ==========================================
-- 9. ADMIN RPC FUNCTIONS (with Hierarchy Protection)
-- ==========================================

-- Custom type for get_admin_users
DROP TYPE IF EXISTS public.admin_user_data CASCADE;
CREATE TYPE public.admin_user_data AS (
    id uuid,
    email text,
    role public.user_role_enum,
    created_at timestamptz,
    is_active boolean
);

-- Get List of Users for Admin
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS SETOF public.admin_user_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    RETURN QUERY
    SELECT au.id, au.email::text, p.role, au.created_at, p.is_active
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    ORDER BY au.created_at DESC;
END;
$$;

-- Update User Role (with hierarchy check)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role text;
    caller_created_at timestamptz;
    target_role text;
    target_created_at timestamptz;
BEGIN
    SELECT role, created_at INTO caller_role, caller_created_at FROM public.profiles WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Bạn không có quyền Admin.';
    END IF;

    SELECT role, created_at INTO target_role, target_created_at FROM public.profiles WHERE id = target_user_id;

    IF target_role = 'admin' AND target_created_at <= caller_created_at THEN
        RAISE EXCEPTION 'Hierarchy violation: Bạn không có quyền thay đổi vai trò của người quản trị được tạo trước bạn.';
    END IF;

    UPDATE public.profiles
    SET role = new_role::public.user_role_enum
    WHERE id = target_user_id;
END;
$$;

-- Delete User Account (with hierarchy check)
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role text;
    caller_created_at timestamptz;
    target_role text;
    target_created_at timestamptz;
BEGIN
    SELECT role, created_at INTO caller_role, caller_created_at FROM public.profiles WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Bạn không có quyền Admin.';
    END IF;
    
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'Cannot delete yourself. Bạn không thể tự xoá chính mình.';
    END IF;

    SELECT role, created_at INTO target_role, target_created_at FROM public.profiles WHERE id = target_user_id;

    IF target_role = 'admin' AND target_created_at <= caller_created_at THEN
        RAISE EXCEPTION 'Hierarchy violation: Bạn không có quyền xoá người quản trị được tạo trước bạn.';
    END IF;

    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Admin Create New User
-- IMPORTANT: All token/string columns MUST be '' (empty string), NOT NULL.
-- Supabase Auth's Go scanner crashes with "converting NULL to string is unsupported"
CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email text, 
  new_password text, 
  new_role text,
  new_active boolean
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    new_id uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    new_id := gen_random_uuid();

    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at,
        confirmation_token, recovery_token,
        email_change_token_new, email_change_token_current,
        reauthentication_token,
        email_change, phone_change, phone_change_token,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
        new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        new_email, extensions.crypt(new_password, extensions.gen_salt('bf')),
        now(),
        '', '', '', '', '', '', '', '',
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );

    INSERT INTO public.profiles (id, role, is_active, created_at, updated_at)
    VALUES (new_id, new_role::public.user_role_enum, new_active, now(), now())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = EXCLUDED.is_active;
    
    RETURN new_id;
END;
$function$;

-- Set User Active Status (Approve/Block, with hierarchy check)
CREATE OR REPLACE FUNCTION public.set_user_active_status(target_user_id uuid, new_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role text;
    caller_created_at timestamptz;
    target_role text;
    target_created_at timestamptz;
BEGIN
    SELECT role, created_at INTO caller_role, caller_created_at FROM public.profiles WHERE id = auth.uid();

    IF caller_role IS NULL OR caller_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Bạn không có quyền Admin.';
    END IF;

    SELECT role, created_at INTO target_role, target_created_at FROM public.profiles WHERE id = target_user_id;

    IF target_role = 'admin' AND target_created_at <= caller_created_at THEN
        RAISE EXCEPTION 'Hierarchy violation: Bạn không có quyền thay đổi trạng thái của người quản trị được tạo trước bạn.';
    END IF;

    UPDATE public.profiles
    SET is_active = new_status
    WHERE id = target_user_id;
    
    IF new_status = true THEN
        UPDATE auth.users 
        SET email_confirmed_at = NOW() 
        WHERE id = target_user_id AND email_confirmed_at IS NULL;
    END IF;
END;
$$;

-- ==========================================
-- 10. SCHEDULED JOBS (pg_cron)
-- ==========================================
-- NOTE: Requires pg_cron extension enabled in Supabase Dashboard -> Database -> Extensions

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'delete-old-change-requests',
    '0 0 * * *',
    $$
        DELETE FROM public.change_requests
        WHERE created_at < NOW() - INTERVAL '30 days'
          AND status IN ('approved', 'rejected');
    $$
);

-- ==========================================
-- 11. REALTIME
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'persons'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.persons;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'change_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.change_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;

ALTER TABLE public.persons REPLICA IDENTITY FULL;
ALTER TABLE public.change_requests REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
