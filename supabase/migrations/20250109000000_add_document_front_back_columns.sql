-- Add front and back document columns to users table
-- This migration adds separate fields for front and back sides of documents

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS license_front TEXT,
ADD COLUMN IF NOT EXISTS license_back TEXT,
ADD COLUMN IF NOT EXISTS aadhar_front TEXT,
ADD COLUMN IF NOT EXISTS aadhar_back TEXT,
ADD COLUMN IF NOT EXISTS pan_front TEXT,
ADD COLUMN IF NOT EXISTS pan_back TEXT,
ADD COLUMN IF NOT EXISTS bank_front TEXT,
ADD COLUMN IF NOT EXISTS bank_back TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_license_front ON public.users(license_front) WHERE license_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_aadhar_front ON public.users(aadhar_front) WHERE aadhar_front IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_pan_front ON public.users(pan_front) WHERE pan_front IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.users.license_front IS 'Front side of driving license document';
COMMENT ON COLUMN public.users.license_back IS 'Back side of driving license document';
COMMENT ON COLUMN public.users.aadhar_front IS 'Front side of Aadhar card document';
COMMENT ON COLUMN public.users.aadhar_back IS 'Back side of Aadhar card document';
COMMENT ON COLUMN public.users.pan_front IS 'Front side of PAN card document';
COMMENT ON COLUMN public.users.pan_back IS 'Back side of PAN card document';
COMMENT ON COLUMN public.users.bank_front IS 'Front side of bank document (cheque/passbook)';
COMMENT ON COLUMN public.users.bank_back IS 'Back side of bank document (cheque/passbook)';

-- Migrate existing single document fields to front fields (optional, for backward compatibility)
-- Update license to license_front if license exists and license_front is null
UPDATE public.users 
SET license_front = license 
WHERE license IS NOT NULL AND license_front IS NULL;

UPDATE public.users 
SET aadhar_front = aadhar 
WHERE aadhar IS NOT NULL AND aadhar_front IS NULL;

UPDATE public.users 
SET pan_front = pan 
WHERE pan IS NOT NULL AND pan_front IS NULL;

