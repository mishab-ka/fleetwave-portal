-- Add uber_profile column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS uber_profile TEXT;

-- Create storage bucket for uber profiles if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uber_profiles', 'uber_profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for uber_profiles bucket
CREATE POLICY "Users can view their own uber profile"
ON storage.objects FOR SELECT
USING (bucket_id = 'uber_profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own uber profile"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uber_profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own uber profile"
ON storage.objects FOR UPDATE
USING (bucket_id = 'uber_profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uber profile"
ON storage.objects FOR DELETE
USING (bucket_id = 'uber_profiles' AND auth.uid()::text = (storage.foldername(name))[1]); 