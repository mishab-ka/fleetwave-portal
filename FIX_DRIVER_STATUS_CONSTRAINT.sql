-- Quick fix for driver_status constraint to allow "going_to_24hr"
-- Run this SQL directly in your Supabase SQL editor to fix the constraint error

-- Step 1: Drop the existing check constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_driver_status_check;

-- Step 2: Add the new check constraint that includes "going_to_24hr"
ALTER TABLE public.users 
ADD CONSTRAINT users_driver_status_check 
CHECK (driver_status IS NULL OR driver_status IN ('leave', 'resigning', 'going_to_24hr'));

-- Step 3: Add comment for documentation
COMMENT ON COLUMN public.users.driver_status IS 'Driver status: leave (on leave), resigning (resigning from company), going_to_24hr (transitioning to 24hr shift), or NULL (just offline)';

-- Verify the constraint was updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'users_driver_status_check';

