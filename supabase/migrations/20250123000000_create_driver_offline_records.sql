-- Create driver_offline_records table
-- This table stores offline records for drivers on specific dates
-- Allows admins to mark drivers as offline instead of leave

CREATE TABLE IF NOT EXISTS driver_offline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_name VARCHAR(255) NOT NULL,
  vehicle_number VARCHAR(20),
  shift VARCHAR(20),
  offline_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per driver per date
  CONSTRAINT unique_driver_offline_date UNIQUE (user_id, offline_date)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_driver_offline_records_user_id ON driver_offline_records(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_offline_records_date ON driver_offline_records(offline_date);
CREATE INDEX IF NOT EXISTS idx_driver_offline_records_user_date ON driver_offline_records(user_id, offline_date);

-- Add comment
COMMENT ON TABLE driver_offline_records IS 'Stores offline records for drivers on specific dates. Used to mark drivers as offline in the rent calendar.';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_driver_offline_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_offline_records_updated_at
  BEFORE UPDATE ON driver_offline_records
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_offline_records_updated_at();

-- Enable Row Level Security
ALTER TABLE driver_offline_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read offline records
CREATE POLICY "Allow authenticated users to read offline records"
  ON driver_offline_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to insert offline records
CREATE POLICY "Allow admins and managers to insert offline records"
  ON driver_offline_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Allow admins and managers to update offline records
CREATE POLICY "Allow admins and managers to update offline records"
  ON driver_offline_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Allow admins and managers to delete offline records
CREATE POLICY "Allow admins and managers to delete offline records"
  ON driver_offline_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Query examples:
-- Get all offline records for a date range
-- SELECT * FROM driver_offline_records
-- WHERE offline_date BETWEEN '2025-01-01' AND '2025-01-31'
-- ORDER BY offline_date, driver_name;

-- Get offline records for a specific driver
-- SELECT * FROM driver_offline_records
-- WHERE user_id = 'driver-uuid'
-- ORDER BY offline_date DESC;

-- Get offline records for a specific date
-- SELECT * FROM driver_offline_records
-- WHERE offline_date = '2025-01-22'
-- ORDER BY driver_name;




