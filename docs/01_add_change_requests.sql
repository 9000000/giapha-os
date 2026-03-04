-- ==========================================
-- ADD CHANGE REQUESTS TABLE
-- ==========================================

-- Enum for request status
DO $$ BEGIN
    CREATE TYPE public.request_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for action type
DO $$ BEGIN
    CREATE TYPE public.action_type_enum AS ENUM ('insert', 'update', 'delete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CHANGE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action public.action_type_enum NOT NULL,
  target_table TEXT NOT NULL, -- e.g., 'persons', 'relationships', 'custom_events'
  target_record_id UUID,     -- Can be null for 'insert' if ID is generated later, but usually we generate UUID in advance
  old_data JSONB,            -- State before change (useful for update/delete, or for admin review)
  new_data JSONB,            -- New state to apply (for insert/update)
  status public.request_status_enum DEFAULT 'pending' NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid() NOT NULL,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON public.change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_requested_by ON public.change_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_change_requests_target_table ON public.change_requests(target_table);

-- RLS
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin (assuming exists in schema)
-- Create or replace just in case it's not defined or we need it here
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is editor
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'editor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can do everything
DROP POLICY IF EXISTS "Admins can manage change requests" ON public.change_requests;
CREATE POLICY "Admins can manage change requests" ON public.change_requests 
  FOR ALL TO authenticated USING (public.is_admin());

-- Editor/Member can read their own requests
DROP POLICY IF EXISTS "Users can read own change requests" ON public.change_requests;
CREATE POLICY "Users can read own change requests" ON public.change_requests 
  FOR SELECT TO authenticated USING (auth.uid() = requested_by);

-- Editor can insert requests
DROP POLICY IF EXISTS "Editors can insert change requests" ON public.change_requests;
CREATE POLICY "Editors can insert change requests" ON public.change_requests 
  FOR INSERT TO authenticated WITH CHECK (public.is_editor() OR public.is_admin());

-- Users can update their own PENDING requests (optional, e.g., to cancel or edit before review)
DROP POLICY IF EXISTS "Users can update own pending change requests" ON public.change_requests;
CREATE POLICY "Users can update own pending change requests" ON public.change_requests 
  FOR UPDATE TO authenticated USING (auth.uid() = requested_by AND status = 'pending');

-- Users can delete their own PENDING requests (cancel request)
DROP POLICY IF EXISTS "Users can delete own pending change requests" ON public.change_requests;
CREATE POLICY "Users can delete own pending change requests" ON public.change_requests 
  FOR DELETE TO authenticated USING (auth.uid() = requested_by AND status = 'pending');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tr_change_requests_updated_at ON public.change_requests;
CREATE TRIGGER tr_change_requests_updated_at BEFORE UPDATE ON public.change_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add a comment explaining usage
COMMENT ON TABLE public.change_requests IS 'Stores pending modifications (insert, update, delete) proposed by editors that require admin approval.';
