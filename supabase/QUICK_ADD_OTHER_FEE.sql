-- =====================================================
-- QUICK MIGRATION: Add other_fee column
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add the column
ALTER TABLE fleet_reports
ADD COLUMN IF NOT EXISTS other_fee DECIMAL(10,2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN fleet_reports.other_fee IS 'Flexible fee/expense field for platform fees, fuel costs, maintenance, or any other expenses';

-- Create index
CREATE INDEX IF NOT EXISTS idx_fleet_reports_other_fee ON fleet_reports(other_fee);

-- =====================================================
-- OPTIONAL: Copy existing platform_fee data
-- =====================================================
-- Uncomment the next line if you want to migrate existing data:
-- UPDATE fleet_reports SET other_fee = COALESCE(platform_fee, 0) WHERE other_fee = 0;

-- =====================================================
-- Verify the change
-- =====================================================
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'fleet_reports' 
AND column_name IN ('other_fee', 'platform_fee');

