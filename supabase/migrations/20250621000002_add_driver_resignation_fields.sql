-- Add driver resignation fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS resigning_date DATE,
ADD COLUMN IF NOT EXISTS resignation_reason TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_resigning_date ON public.users(resigning_date);

-- Add comments for documentation
COMMENT ON COLUMN public.users.resigning_date IS 'Date when driver resigned or is scheduled to resign';
COMMENT ON COLUMN public.users.resignation_reason IS 'Reason provided by driver for resignation'; 