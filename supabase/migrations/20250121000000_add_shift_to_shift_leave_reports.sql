-- Add shift column to shift_leave_reports table
ALTER TABLE shift_leave_reports 
ADD COLUMN IF NOT EXISTS shift VARCHAR(20) CHECK (shift IN ('morning', 'night'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_shift_leave_reports_shift ON shift_leave_reports(report_date, shift);

-- Update unique constraint to ensure one report per date and shift combination
-- First, drop any existing unique constraints on report_date if they exist
DO $$
BEGIN
  -- Check if there's a unique constraint on report_date
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shift_leave_reports_report_date_key'
  ) THEN
    ALTER TABLE shift_leave_reports DROP CONSTRAINT shift_leave_reports_report_date_key;
  END IF;
END $$;

-- Add unique constraint on report_date and shift combination
ALTER TABLE shift_leave_reports 
ADD CONSTRAINT shift_leave_reports_date_shift_unique UNIQUE (report_date, shift);




