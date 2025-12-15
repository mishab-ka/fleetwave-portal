-- Add driver_category column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS driver_category VARCHAR(20) DEFAULT 'hub_base' 
CHECK (driver_category IN ('hub_base', 'salary_base'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_driver_category ON public.users(driver_category);

-- Add comment for documentation
COMMENT ON COLUMN public.users.driver_category IS 'Driver category: hub_base (uses trip-based reporting) or salary_base (uses salary-based reporting)';


