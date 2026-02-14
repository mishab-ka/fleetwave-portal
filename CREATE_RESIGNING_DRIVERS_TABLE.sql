-- Quick fix SQL script to create resigning_drivers table
-- Run this directly in Supabase SQL Editor if needed

-- Create resigning_drivers table to store resigning information
CREATE TABLE IF NOT EXISTS public.resigning_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resignation_date DATE NOT NULL,
  resignation_reason TEXT NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resigning_drivers_driver_id 
  ON public.resigning_drivers(driver_id);

CREATE INDEX IF NOT EXISTS idx_resigning_drivers_resignation_date 
  ON public.resigning_drivers(resignation_date);

CREATE INDEX IF NOT EXISTS idx_resigning_drivers_status 
  ON public.resigning_drivers(status);

CREATE INDEX IF NOT EXISTS idx_resigning_drivers_submission_date 
  ON public.resigning_drivers(submission_date DESC);

-- Enable Row Level Security
ALTER TABLE public.resigning_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Drivers can view their own resignations"
  ON public.resigning_drivers FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own resignation"
  ON public.resigning_drivers FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins and HR can view all resignations"
  ON public.resigning_drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Admins and HR can update resignations"
  ON public.resigning_drivers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr', 'manager')
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_resigning_drivers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resigning_drivers_updated_at
  BEFORE UPDATE ON public.resigning_drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_resigning_drivers_updated_at();

