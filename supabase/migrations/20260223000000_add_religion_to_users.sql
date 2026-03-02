-- Add religion column to users table (Driver Details & Profile)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS religion TEXT;

COMMENT ON COLUMN public.users.religion IS 'Driver religion: Hindu, Muslim, or Christian';

CREATE INDEX IF NOT EXISTS idx_users_religion ON public.users(religion) WHERE religion IS NOT NULL;
