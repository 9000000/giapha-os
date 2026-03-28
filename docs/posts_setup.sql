-- ==========================================
-- POSTS TABLE SETUP
-- Chạy file này trên Supabase SQL Editor
-- ==========================================

-- POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.posts IS 'Blog posts and family documentation articles.';

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON public.posts(updated_at DESC NULLS LAST);

-- TRIGGER: auto update updated_at
DROP TRIGGER IF EXISTS tr_posts_updated_at ON public.posts;
CREATE TRIGGER tr_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read published posts (even anon for public pages)
DROP POLICY IF EXISTS "Anyone can read published posts" ON public.posts;
CREATE POLICY "Anyone can read published posts" ON public.posts
  FOR SELECT USING (status = 'published');

-- Authenticated users can read all posts (including drafts)
DROP POLICY IF EXISTS "Authenticated users can read all posts" ON public.posts;
CREATE POLICY "Authenticated users can read all posts" ON public.posts
  FOR SELECT TO authenticated USING (true);

-- Admins and Editors can insert posts
DROP POLICY IF EXISTS "Admins and Editors can insert posts" ON public.posts;
CREATE POLICY "Admins and Editors can insert posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_editor());

-- Admins and Editors can update posts
DROP POLICY IF EXISTS "Admins and Editors can update posts" ON public.posts;
CREATE POLICY "Admins and Editors can update posts" ON public.posts
  FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_editor())
  WITH CHECK (public.is_admin() OR public.is_editor());

-- Admins and Editors can delete posts
DROP POLICY IF EXISTS "Admins and Editors can delete posts" ON public.posts;
CREATE POLICY "Admins and Editors can delete posts" ON public.posts
  FOR DELETE TO authenticated USING (public.is_admin() OR public.is_editor());

-- STORAGE: Create 'posts' bucket for thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for posts bucket
DROP POLICY IF EXISTS "Post images are publicly accessible." ON storage.objects;
CREATE POLICY "Post images are publicly accessible." ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Authenticated users can upload post images." ON storage.objects;
CREATE POLICY "Authenticated users can upload post images." ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update post images." ON storage.objects;
CREATE POLICY "Authenticated users can update post images." ON storage.objects
  FOR UPDATE USING (bucket_id = 'posts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete post images." ON storage.objects;
CREATE POLICY "Authenticated users can delete post images." ON storage.objects
  FOR DELETE USING (bucket_id = 'posts' AND auth.role() = 'authenticated');
