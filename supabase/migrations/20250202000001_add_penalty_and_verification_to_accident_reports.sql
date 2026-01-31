-- ============================================
-- Add Penalty Amount and Verification Status to Accident Reports
-- ============================================

-- Add penalty_amount column
ALTER TABLE public.accident_reports
ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(12, 2) DEFAULT 0;

-- Add verification_status column
ALTER TABLE public.accident_reports
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending_verification';

-- Add CHECK constraint for verification_status
ALTER TABLE public.accident_reports
DROP CONSTRAINT IF EXISTS accident_reports_verification_status_check;

ALTER TABLE public.accident_reports
ADD CONSTRAINT accident_reports_verification_status_check 
CHECK (verification_status IN ('pending_verification', 'approved', 'rejected'));

-- Update existing records to have pending_verification status if NULL
UPDATE public.accident_reports
SET verification_status = 'pending_verification'
WHERE verification_status IS NULL;

-- Add comments
COMMENT ON COLUMN public.accident_reports.penalty_amount IS 'Penalty amount for the accident (₹)';
COMMENT ON COLUMN public.accident_reports.verification_status IS 'Report verification status: pending_verification, approved, or rejected';

-- Create index for verification_status
CREATE INDEX IF NOT EXISTS idx_accident_reports_verification_status 
ON public.accident_reports(verification_status);

