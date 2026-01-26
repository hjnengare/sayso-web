-- Create saved_specials table
CREATE TABLE IF NOT EXISTS public.saved_specials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  special_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- Prevent duplicate saves
  UNIQUE(user_id, special_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_specials_user_id ON public.saved_specials(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_specials_special_id ON public.saved_specials(special_id);
CREATE INDEX IF NOT EXISTS idx_saved_specials_user_created ON public.saved_specials(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.saved_specials ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see/modify their own saved specials
CREATE POLICY "Users can view their own saved specials"
  ON public.saved_specials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved specials"
  ON public.saved_specials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved specials"
  ON public.saved_specials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);