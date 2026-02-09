-- Quick fix to add accident_date and accident_time columns to accident_reports table
-- Run this SQL directly in your Supabase SQL editor

-- Step 1: Add the columns
ALTER TABLE public.accident_reports
ADD COLUMN IF NOT EXISTS accident_date DATE,
ADD COLUMN IF NOT EXISTS accident_time TIME;

-- Step 2: Add comments
COMMENT ON COLUMN public.accident_reports.accident_date IS 'Date when the accident occurred';
COMMENT ON COLUMN public.accident_reports.accident_time IS 'Time when the accident occurred';

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_accident_reports_accident_date 
ON public.accident_reports(accident_date);

-- Step 4: Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accident_reports' 
  AND table_schema = 'public'
  AND column_name IN ('accident_date', 'accident_time')
ORDER BY column_name;

