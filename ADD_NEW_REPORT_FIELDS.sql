-- Add new columns to fleet_reports table
ALTER TABLE fleet_reports
ADD COLUMN IF NOT EXISTS cng_expense DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS km_runned DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_service_day BOOLEAN DEFAULT FALSE;

-- Create an index for better query performance on service_day filter
CREATE INDEX IF NOT EXISTS idx_fleet_reports_service_day ON fleet_reports(is_service_day);

-- Optional: Add a comment to describe the new columns
COMMENT ON COLUMN fleet_reports.cng_expense IS 'CNG expense for the day';
COMMENT ON COLUMN fleet_reports.km_runned IS 'Total kilometers run for the day';
COMMENT ON COLUMN fleet_reports.is_service_day IS 'Indicates if this is a service day report';




