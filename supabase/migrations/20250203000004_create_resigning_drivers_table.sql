-- Create resigning_drivers table to store resigning information
-- This table stores all resignation submissions and their details

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resigning_drivers_driver_id 
  ON public.resigning_drivers(driver_id);

CREATE INDEX IF NOT EXISTS idx_resigning_drivers_resignation_date 
  ON public.resigning_drivers(resignation_date);

CREATE INDEX IF NOT EXISTS idx_resigning_drivers_status 
  ON public.resigning_drivers(status);

CREATE INDEX IF NOT EXISTS idx_resigning_drivers_submission_date 
  ON public.resigning_drivers(submission_date DESC);

-- Add comment to table
COMMENT ON TABLE public.resigning_drivers IS 
  'Stores resignation information submitted by drivers. Tracks resignation date, reason, submission date, and approval status.';

-- Add comments to columns
COMMENT ON COLUMN public.resigning_drivers.driver_id IS 
  'Reference to the driver (user) who is resigning';
COMMENT ON COLUMN public.resigning_drivers.resignation_date IS 
  'The last working date of the driver';
COMMENT ON COLUMN public.resigning_drivers.resignation_reason IS 
  'Detailed reason provided by the driver for resignation';
COMMENT ON COLUMN public.resigning_drivers.submission_date IS 
  'Date and time when the resignation was submitted';
COMMENT ON COLUMN public.resigning_drivers.status IS 
  'Status of the resignation: pending, approved, rejected, or processed';
COMMENT ON COLUMN public.resigning_drivers.reviewed_by IS 
  'Admin/HR user who reviewed the resignation';
COMMENT ON COLUMN public.resigning_drivers.admin_remarks IS 
  'Additional remarks or notes from admin/HR';

-- Enable Row Level Security
ALTER TABLE public.resigning_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow drivers to view their own resignation records
CREATE POLICY "Drivers can view their own resignations"
  ON public.resigning_drivers
  FOR SELECT
  USING (auth.uid() = driver_id);

-- Allow drivers to insert their own resignation
CREATE POLICY "Drivers can insert their own resignation"
  ON public.resigning_drivers
  FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Allow admins and HR to view all resignations
CREATE POLICY "Admins and HR can view all resignations"
  ON public.resigning_drivers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr', 'manager')
    )
  );

-- Allow admins and HR to update resignations
CREATE POLICY "Admins and HR can update resignations"
  ON public.resigning_drivers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr', 'manager')
    )
  );

-- Create trigger to update updated_at timestamp
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

