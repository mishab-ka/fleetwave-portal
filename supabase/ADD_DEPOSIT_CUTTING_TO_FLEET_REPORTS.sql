-- Add deposit_cutting_amount column to fleet_reports table
-- This will store the deposit cutting amount calculated at the time of report submission

ALTER TABLE fleet_reports 
ADD COLUMN IF NOT EXISTS deposit_cutting_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN fleet_reports.deposit_cutting_amount IS 'Deposit cutting amount calculated at report submission time. This amount is fixed and does not change even if admin edits the report.';

-- Update existing records to have 0 deposit cutting (for backward compatibility)
UPDATE fleet_reports 
SET deposit_cutting_amount = 0 
WHERE deposit_cutting_amount IS NULL;
