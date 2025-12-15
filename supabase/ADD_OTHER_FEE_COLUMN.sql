-- =====================================================
-- ADD OTHER_FEE COLUMN TO FLEET_REPORTS TABLE
-- =====================================================
-- This migration replaces platform_fee with a more flexible other_fee column
-- that can be used for any expenses (platform fee, fuel, maintenance, etc.)
-- =====================================================

-- Add the new other_fee column
ALTER TABLE fleet_reports
ADD COLUMN IF NOT EXISTS other_fee DECIMAL(10,2) DEFAULT 0;

-- Add a comment to describe the column
COMMENT ON COLUMN fleet_reports.other_fee IS 'Flexible fee/expense field for platform fees, fuel costs, maintenance, or any other expenses';

-- Optional: Migrate existing platform_fee data to other_fee if needed
-- Uncomment the following line if you want to copy existing platform_fee values to other_fee
-- UPDATE fleet_reports SET other_fee = platform_fee WHERE platform_fee IS NOT NULL AND other_fee = 0;

-- Optional: You can drop the platform_fee column if you want to completely replace it
-- WARNING: Only uncomment this if you're sure you want to remove the old column
-- ALTER TABLE fleet_reports DROP COLUMN IF EXISTS platform_fee;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_fleet_reports_other_fee ON fleet_reports(other_fee);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify the column was added successfully:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'fleet_reports' AND column_name = 'other_fee';

