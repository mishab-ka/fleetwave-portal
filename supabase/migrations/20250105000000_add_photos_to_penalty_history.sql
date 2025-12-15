-- Add photos column to penalty_history table
ALTER TABLE penalty_history 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Add comment for the photos column
COMMENT ON COLUMN penalty_history.photos IS 'Array of photo URLs for penalty evidence';

-- Create storage bucket for penalty photos (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('penalty_photos', 'penalty_photos', true);

