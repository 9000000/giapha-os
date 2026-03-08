-- ==========================================
-- NOTIFICATION READS TABLE
-- Stores read notification state per user in the database
-- to persist across browser cache clears and device changes
-- ==========================================

-- Table to store which notifications a user has read
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_key TEXT NOT NULL, -- format: "type::id" (e.g. "new_member::abc-123")
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_key) -- each user marks a notification as read only once
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Users can only view their own read records
DROP POLICY IF EXISTS "Users can view own reads" ON public.notification_reads;
CREATE POLICY "Users can view own reads" ON public.notification_reads
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own read records
DROP POLICY IF EXISTS "Users can insert own reads" ON public.notification_reads;
CREATE POLICY "Users can insert own reads" ON public.notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own read records (for cleanup)
DROP POLICY IF EXISTS "Users can delete own reads" ON public.notification_reads;
CREATE POLICY "Users can delete own reads" ON public.notification_reads
  FOR DELETE USING (auth.uid() = user_id);
