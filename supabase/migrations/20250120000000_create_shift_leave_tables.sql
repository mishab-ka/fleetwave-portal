-- Create shift_leave_reports table
CREATE TABLE IF NOT EXISTS shift_leave_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_active_vehicles INTEGER NOT NULL,
  total_available_shifts INTEGER NOT NULL, -- active_vehicles * 2
  shifts_runned INTEGER NOT NULL DEFAULT 0,
  shifts_leave INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift_leave_details table
CREATE TABLE IF NOT EXISTS shift_leave_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_leave_report_id UUID REFERENCES shift_leave_reports(id) ON DELETE CASCADE,
  vehicle_number VARCHAR(20) NOT NULL REFERENCES vehicles(vehicle_number),
  driver_id UUID REFERENCES users(id), -- nullable if no driver assigned
  driver_name VARCHAR(255), -- denormalized for history
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('leave', 'missed')),
  reason TEXT,
  shift VARCHAR(20), -- morning/night/24hr if applicable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_leave_reports_date ON shift_leave_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_shift_leave_reports_created_by ON shift_leave_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_shift_leave_details_report_id ON shift_leave_details(shift_leave_report_id);
CREATE INDEX IF NOT EXISTS idx_shift_leave_details_vehicle ON shift_leave_details(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_shift_leave_details_driver ON shift_leave_details(driver_id);

-- Enable RLS
ALTER TABLE shift_leave_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_leave_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_leave_reports
-- Allow admins and managers to read all reports
CREATE POLICY "Admins and managers can view shift leave reports"
  ON shift_leave_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Allow admins and managers to insert reports
CREATE POLICY "Admins and managers can create shift leave reports"
  ON shift_leave_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Allow admins and managers to update reports
CREATE POLICY "Admins and managers can update shift leave reports"
  ON shift_leave_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- RLS Policies for shift_leave_details
-- Allow admins and managers to read all details
CREATE POLICY "Admins and managers can view shift leave details"
  ON shift_leave_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Allow admins and managers to insert details
CREATE POLICY "Admins and managers can create shift leave details"
  ON shift_leave_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Allow admins and managers to update details
CREATE POLICY "Admins and managers can update shift leave details"
  ON shift_leave_details
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Add comment to tables
COMMENT ON TABLE shift_leave_reports IS 'Main table for tracking daily shift leave reports';
COMMENT ON TABLE shift_leave_details IS 'Detailed records of each leave/missed shift with vehicle and driver information';

