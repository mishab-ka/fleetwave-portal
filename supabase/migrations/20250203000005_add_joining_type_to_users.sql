-- Add joining_type column to users table
-- This column stores whether a driver is "new_joining" or "rejoining" when they are activated

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS joining_type VARCHAR(20) 
  CHECK (joining_type IS NULL OR joining_type IN ('new_joining', 'rejoining'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_joining_type 
  ON public.users(joining_type) 
  WHERE joining_type IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.users.joining_type IS 
  'Type of joining when driver is activated: new_joining (first time joining) or rejoining (returning driver). Only set when driver is put online.';

