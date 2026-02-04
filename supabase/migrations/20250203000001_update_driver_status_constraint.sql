-- Update driver_status CHECK constraint to include "going_to_24hr"
-- This allows drivers to be marked as "going_to_24hr" when transitioning to 24hr shift

-- Drop the existing check constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_driver_status_check;

-- Add the new check constraint that includes "going_to_24hr"
ALTER TABLE public.users 
ADD CONSTRAINT users_driver_status_check 
CHECK (driver_status IS NULL OR driver_status IN ('leave', 'resigning', 'going_to_24hr'));

-- Add comment for documentation
COMMENT ON COLUMN public.users.driver_status IS 'Driver status: leave (on leave), resigning (resigning from company), going_to_24hr (transitioning to 24hr shift), or NULL (just offline)';

