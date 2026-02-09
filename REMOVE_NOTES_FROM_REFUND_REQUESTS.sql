-- Quick fix to remove notes column from driver_refund_requests table
-- Run this SQL directly in your Supabase SQL editor

-- Step 1: Drop the notes column
ALTER TABLE public.driver_refund_requests 
DROP COLUMN IF EXISTS notes;

-- Step 2: Verify the column has been removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'driver_refund_requests' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

