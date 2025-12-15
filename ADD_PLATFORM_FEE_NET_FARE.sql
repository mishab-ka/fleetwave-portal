-- Add platform_fee and net_fare columns to fleet_reports table
ALTER TABLE fleet_reports 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_fare DECIMAL(10,2) DEFAULT 0;

-- Add comments to explain the columns
COMMENT ON COLUMN fleet_reports.platform_fee IS 'Platform fee amount (14% of net fare - e.g., 70 for 500rs, 140 for 1000rs)';
COMMENT ON COLUMN fleet_reports.net_fare IS 'Net fare amount after platform fee deduction';

-- Update existing records to have default values
UPDATE fleet_reports 
SET platform_fee = 0, net_fare = 0 
WHERE platform_fee IS NULL OR net_fare IS NULL;

-- Make the columns NOT NULL after setting default values
ALTER TABLE fleet_reports 
ALTER COLUMN platform_fee SET NOT NULL,
ALTER COLUMN net_fare SET NOT NULL;
