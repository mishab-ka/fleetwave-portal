-- ============================================================
-- SQL Script: Setup Document Upload Columns and Storage Bucket
-- ============================================================
-- Run this script in Supabase SQL Editor
-- This creates the necessary columns and storage bucket for document uploads
-- ============================================================

-- ============================================================
-- PART 1: Add Document Columns to users table
-- ============================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS license_front TEXT,
ADD COLUMN IF NOT EXISTS license_back TEXT,
ADD COLUMN IF NOT EXISTS aadhar_front TEXT,
ADD COLUMN IF NOT EXISTS aadhar_back TEXT,
ADD COLUMN IF NOT EXISTS pan_front TEXT,
ADD COLUMN IF NOT EXISTS pan_back TEXT,
ADD COLUMN IF NOT EXISTS bank_front TEXT,
ADD COLUMN IF NOT EXISTS bank_back TEXT;

-- ============================================================
-- PART 2: Create Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_license_front ON public.users(license_front) WHERE license_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_aadhar_front ON public.users(aadhar_front) WHERE aadhar_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_pan_front ON public.users(pan_front) WHERE pan_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_bank_front ON public.users(bank_front) WHERE bank_front IS NOT NULL;

-- ============================================================
-- PART 3: Migrate Existing Data (Optional - for backward compatibility)
-- ============================================================
-- Uncomment these if you want to migrate existing single document fields to front fields
/*
UPDATE public.users 
SET license_front = license 
WHERE license IS NOT NULL AND license_front IS NULL;

UPDATE public.users 
SET aadhar_front = aadhar 
WHERE aadhar IS NOT NULL AND aadhar_front IS NULL;

UPDATE public.users 
SET pan_front = pan 
WHERE pan IS NOT NULL AND pan_front IS NULL;
*/

-- ============================================================
-- PART 4: Create Storage Bucket
-- ============================================================
-- IMPORTANT: The 'uploads' bucket might already exist
-- If you get an error that the bucket already exists, skip this part
-- You can check existing buckets in: Storage > Settings

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PART 5: Set up Storage Policies (RLS)
-- ============================================================
-- NOTE: Storage policies must be created through Supabase Dashboard
-- Go to: Storage > Settings > Policies > New Policy
-- 
-- Or use the SQL below ONLY if you have service_role access
-- (Typically these need to be created through the dashboard UI)
-- ============================================================

-- IMPORTANT: The following policies need to be created manually through
-- Supabase Dashboard > Storage > uploads bucket > Policies
-- 
-- For each policy below, create it in the dashboard with:
-- 1. Policy Name: (as shown below)
-- 2. Allowed Operation: (INSERT/SELECT/UPDATE/DELETE)
-- 3. Target Roles: authenticated
-- 4. Policy Definition: (copy the USING/WITH CHECK clause)

-- ============================================================
-- Policy 1: "Users can upload their own documents"
-- Operation: INSERT
-- Policy Definition:
-- bucket_id = 'uploads'
-- ============================================================

-- ============================================================
-- Policy 2: "Users can view their own documents"
-- Operation: SELECT
-- Policy Definition:
-- bucket_id = 'uploads'
-- ============================================================

-- ============================================================
-- Policy 3: "Users can update their own documents"
-- Operation: UPDATE
-- Policy Definition:
-- bucket_id = 'uploads'
-- ============================================================

-- ============================================================
-- Policy 4: "Users can delete their own documents"
-- Operation: DELETE
-- Policy Definition:
-- bucket_id = 'uploads'
-- ============================================================

-- ============================================================
-- Alternative: Simplified Policies (run these if you have permissions)
-- These allow all authenticated users to access uploads bucket
-- ============================================================

-- Uncomment below only if you have service_role access or are the owner:

/*
-- Allow authenticated users to upload to uploads bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to view uploads bucket
CREATE POLICY "Authenticated users can view uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to update uploads bucket
CREATE POLICY "Authenticated users can update uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to delete from uploads bucket
CREATE POLICY "Authenticated users can delete uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
*/

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the setup:

-- Check if columns were created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE '%_front' OR column_name LIKE '%_back'
ORDER BY column_name;

-- Check if bucket exists
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'uploads';

-- Check storage policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

