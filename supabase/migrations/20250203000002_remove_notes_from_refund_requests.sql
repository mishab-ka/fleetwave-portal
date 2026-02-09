-- Remove notes column from driver_refund_requests table
-- This column is no longer needed as notes field has been removed from the UI

-- Drop the notes column
ALTER TABLE public.driver_refund_requests 
DROP COLUMN IF EXISTS notes;

-- Add comment for documentation
COMMENT ON TABLE public.driver_refund_requests IS 'Tracks refund payout requests against a driver''s positive R&F (refund) balance. Notes field has been removed.';

