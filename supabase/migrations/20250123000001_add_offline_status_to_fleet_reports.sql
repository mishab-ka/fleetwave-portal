-- Add "offline" status to fleet_reports status CHECK constraint
-- This allows fleet_reports to have status "offline" when drivers are marked as offline

-- Drop the existing check constraint
ALTER TABLE fleet_reports DROP CONSTRAINT IF EXISTS fleet_reports_status_check;

-- Add the new check constraint that includes "offline"
ALTER TABLE fleet_reports ADD CONSTRAINT fleet_reports_status_check 
CHECK (status IN ('pending_verification', 'approved', 'rejected', 'leave', 'offline'));

-- Add comment
COMMENT ON COLUMN fleet_reports.status IS 'Report status: pending_verification, approved, rejected, leave, or offline';




