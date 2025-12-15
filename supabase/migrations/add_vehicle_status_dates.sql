-- Add status date tracking columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS offline_from_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS online_from_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance on status date queries
CREATE INDEX IF NOT EXISTS idx_vehicles_offline_from_date ON public.vehicles(offline_from_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_online_from_date ON public.vehicles(online_from_date);

-- Update existing records to set online_from_date to created_at for currently online vehicles
UPDATE public.vehicles 
SET online_from_date = created_at 
WHERE online = true AND online_from_date IS NULL;

-- Update existing records to set offline_from_date to created_at for currently offline vehicles
UPDATE public.vehicles 
SET offline_from_date = created_at 
WHERE online = false AND offline_from_date IS NULL; 