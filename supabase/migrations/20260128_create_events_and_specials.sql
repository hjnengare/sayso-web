-- Create events_and_specials table for business-owned events and specials
CREATE TABLE IF NOT EXISTS public.events_and_specials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('event', 'special')),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  start_date timestamp WITH TIME ZONE NOT NULL,
  end_date timestamp WITH TIME ZONE,
  location text,
  description text,
  icon text,
  image text,
  price numeric,
  rating numeric DEFAULT 0,
  booking_url text,
  booking_contact text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_and_specials_business_id ON public.events_and_specials(business_id);
CREATE INDEX IF NOT EXISTS idx_events_and_specials_start_date ON public.events_and_specials(start_date);
CREATE INDEX IF NOT EXISTS idx_events_and_specials_type ON public.events_and_specials(type);

-- Enable Row Level Security
ALTER TABLE public.events_and_specials ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view events
CREATE POLICY "Allow public read access to events_and_specials"
  ON public.events_and_specials
  FOR SELECT
  TO public
  USING (true);

-- Only business owner can insert
CREATE POLICY "Allow business owner to insert events_and_specials"
  ON public.events_and_specials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = events_and_specials.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Only business owner can update their events
CREATE POLICY "Allow business owner to update events_and_specials"
  ON public.events_and_specials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = events_and_specials.business_id
      AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = events_and_specials.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Only business owner can delete their events
CREATE POLICY "Allow business owner to delete events_and_specials"
  ON public.events_and_specials
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = events_and_specials.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_events_and_specials()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at_events_and_specials_trigger
BEFORE UPDATE ON public.events_and_specials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_events_and_specials();
