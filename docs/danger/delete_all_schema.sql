-- ==========================================
-- 🚨 DANGER ZONE: DROP GIAPHA-OS DATABASE SCHEMA 🚨
-- ==========================================
-- WARNING: DO NOT RUN THIS SCRIPT UNLESS YOU KNOW EXACTLY WHAT YOU ARE DOING.
-- This script PERMANENTLY removes all tables, functions, triggers, types,
-- storage, cron jobs, and auth users.
-- All data will be LOST irreversibly.
-- ==========================================
-- After running this, re-run giapha_full_setup_all_in_one.sql to rebuild.
-- The first user to register will automatically become Admin.
-- ==========================================

-- 1. DROP TRIGGERS ON EXTERNAL SCHEMAS (auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users CASCADE;

-- 2. DROP TABLES (CASCADE drops triggers, indexes, RLS policies)
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.notification_reads CASCADE;
DROP TABLE IF EXISTS public.change_requests CASCADE;
DROP TABLE IF EXISTS public.custom_events CASCADE;
DROP TABLE IF EXISTS public.relationships CASCADE;
DROP TABLE IF EXISTS public.person_details_private CASCADE;
DROP TABLE IF EXISTS public.persons CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. DROP FUNCTIONS
DROP FUNCTION IF EXISTS public.set_user_active_status(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_users() CASCADE;
DROP FUNCTION IF EXISTS public.handle_first_user_confirmation() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_editor() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- 4. DROP CUSTOM TYPES
DROP TYPE IF EXISTS public.admin_user_data CASCADE;

-- 5. DROP ENUMS
DROP TYPE IF EXISTS public.action_type_enum CASCADE;
DROP TYPE IF EXISTS public.request_status_enum CASCADE;
DROP TYPE IF EXISTS public.user_role_enum CASCADE;
DROP TYPE IF EXISTS public.relationship_type_enum CASCADE;
DROP TYPE IF EXISTS public.gender_enum CASCADE;

-- 6. UNSCHEDULE CRON JOBS (requires pg_cron extension)
SELECT cron.unschedule('delete-old-change-requests');

-- 7. REMOVE REALTIME PUBLICATIONS
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.persons;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.change_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.profiles;

-- 8. DELETE ALL AUTH USERS (creates clean slate for new Admin)
DELETE FROM auth.users;

-- 9. CLEAN STORAGE (remove all uploaded files and buckets)
DELETE FROM storage.objects WHERE bucket_id IN ('avatars', 'posts');
DELETE FROM storage.buckets WHERE id IN ('avatars', 'posts');
