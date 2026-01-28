-- Add exact_working_days column to vehicle_performance table
-- This column is used to calculate Fleet Rent: Daily Rent × Exact Working Days
-- Default value is 7 days

ALTER TABLE public.vehicle_performance
ADD COLUMN IF NOT EXISTS exact_working_days INTEGER DEFAULT 7;

-- Update existing records to set exact_working_days to 7 if NULL
UPDATE public.vehicle_performance
SET exact_working_days = 7
WHERE exact_working_days IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.vehicle_performance.exact_working_days IS 
'Exact working days used for Fleet Rent calculation. Default is 7 days. Formula: Daily Rent × Exact Working Days = Total Rent';




