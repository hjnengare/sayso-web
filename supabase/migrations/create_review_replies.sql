-- Review Replies Table Schema
-- This table stores replies to reviews

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_replies

-- Allow authenticated users to create replies
CREATE POLICY "Users can create replies"
  ON review_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own replies
CREATE POLICY "Users can update their own replies"
  ON review_replies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own replies
CREATE POLICY "Users can delete their own replies"
  ON review_replies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anyone to read replies
CREATE POLICY "Anyone can read replies"
  ON review_replies
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_replies_updated_at
  BEFORE UPDATE ON review_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_review_replies_updated_at();

