-- Add accident_date and accident_time columns to accident_reports table
-- These fields store when the accident actually occurred (separate from submission_date)

ALTER TABLE public.accident_reports
ADD COLUMN IF NOT EXISTS accident_date DATE,
ADD COLUMN IF NOT EXISTS accident_time TIME;

-- Add comments for documentation
COMMENT ON COLUMN public.accident_reports.accident_date IS 'Date when the accident occurred';
COMMENT ON COLUMN public.accident_reports.accident_time IS 'Time when the accident occurred';

-- Create index for accident_date for better query performance
CREATE INDEX IF NOT EXISTS idx_accident_reports_accident_date 
ON public.accident_reports(accident_date);

