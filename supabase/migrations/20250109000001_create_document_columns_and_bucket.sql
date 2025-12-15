-- ============================================================
-- Migration: Add Document Front/Back Columns and Storage Bucket
-- ============================================================
-- This migration:
-- 1. Adds front and back document columns to users table
-- 2. Creates storage bucket for document uploads
-- 3. Sets up RLS policies for the storage bucket
-- ============================================================

-- Step 1: Add front and back document columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS license_front TEXT,
ADD COLUMN IF NOT EXISTS license_back TEXT,
ADD COLUMN IF NOT EXISTS aadhar_front TEXT,
ADD COLUMN IF NOT EXISTS aadhar_back TEXT,
ADD COLUMN IF NOT EXISTS pan_front TEXT,
ADD COLUMN IF NOT EXISTS pan_back TEXT,
ADD COLUMN IF NOT EXISTS bank_front TEXT,
ADD COLUMN IF NOT EXISTS bank_back TEXT;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_license_front ON public.users(license_front) WHERE license_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_aadhar_front ON public.users(aadhar_front) WHERE aadhar_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_pan_front ON public.users(pan_front) WHERE pan_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_bank_front ON public.users(bank_front) WHERE bank_front IS NOT NULL;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN public.users.license_front IS 'Front side of driving license document';
COMMENT ON COLUMN public.users.license_back IS 'Back side of driving license document';
COMMENT ON COLUMN public.users.aadhar_front IS 'Front side of Aadhar card document';
COMMENT ON COLUMN public.users.aadhar_back IS 'Back side of Aadhar card document';
COMMENT ON COLUMN public.users.pan_front IS 'Front side of PAN card document';
COMMENT ON COLUMN public.users.pan_back IS 'Back side of PAN card document';
COMMENT ON COLUMN public.users.bank_front IS 'Front side of bank document (cheque/passbook)';
COMMENT ON COLUMN public.users.bank_back IS 'Back side of bank document (cheque/passbook)';

-- Step 4: Migrate existing single document fields to front fields (optional, for backward compatibility)
UPDATE public.users 
SET license_front = license 
WHERE license IS NOT NULL AND license_front IS NULL;

UPDATE public.users 
SET aadhar_front = aadhar 
WHERE aadhar IS NOT NULL AND aadhar_front IS NULL;

UPDATE public.users 
SET pan_front = pan 
WHERE pan IS NOT NULL AND pan_front IS NULL;

-- Step 5: Create storage bucket (if it doesn't exist)
-- Note: This needs to be run with appropriate permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Set up RLS policies for storage bucket
-- Drop existing policies if they exist, then create new ones

-- Policy: Users can upload their own documents
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = (storage.foldername(name))[1] 
      AND id = auth.uid()
    )
  )
);

-- Policy: Users can view their own documents
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = (storage.foldername(name))[1] 
      AND id = auth.uid()
    )
  )
);

-- Policy: Users can update their own documents
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = (storage.foldername(name))[1] 
      AND id = auth.uid()
    )
  )
);

-- Policy: Users can delete their own documents
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = (storage.foldername(name))[1] 
      AND id = auth.uid()
    )
  )
);

-- Policy: Admins can view all documents
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can delete all documents
DROP POLICY IF EXISTS "Admins can delete all documents" ON storage.objects;
CREATE POLICY "Admins can delete all documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

