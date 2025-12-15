-- Clean up duplicate fleet reports before adding unique constraint
-- Keep the most recent submission for each user_id and rent_date combination

-- First, identify duplicates and keep only the most recent one
DELETE FROM public.fleet_reports 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, rent_date) id
  FROM public.fleet_reports
  ORDER BY user_id, rent_date, submission_date DESC
);

-- Now add the unique constraint
ALTER TABLE public.fleet_reports 
ADD CONSTRAINT fleet_reports_user_rent_date_unique 
UNIQUE (user_id, rent_date);

-- Create index for better performance on user_id and rent_date queries
CREATE INDEX IF NOT EXISTS idx_fleet_reports_user_rent_date 
ON public.fleet_reports(user_id, rent_date); 