-- Create staff_activity_logs table for tracking all staff member activities
CREATE TABLE IF NOT EXISTS staff_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Staff Information
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL, -- admin, manager, accountant, hr_manager, hr_staff
  
  -- Action Details
  action_type TEXT NOT NULL, -- approve_report, reject_report, edit_driver, assign_vehicle, etc.
  action_category TEXT NOT NULL, -- reports, drivers, vehicles, finance, hr, audit, settings
  description TEXT NOT NULL, -- Detailed description with context
  
  -- Context Data (JSON for flexible structure)
  metadata JSONB DEFAULT '{}'::jsonb, -- {report_id, driver_name, vehicle_number, etc.}
  
  -- Changes (for edit actions)
  old_value TEXT,
  new_value TEXT,
  
  -- Page/Module Info
  page_name TEXT,
  page_url TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'approve_report', 'reject_report', 'edit_report',
    'create_driver', 'edit_driver', 'delete_driver', 'driver_online', 'driver_offline',
    'assign_vehicle', 'change_shift', 'assign_service_day',
    'submit_audit', 'approve_audit',
    'create_transaction', 'edit_transaction', 'delete_transaction',
    'view_page', 'export_data', 'filter_data', 'search',
    'create_penalty', 'edit_penalty', 'delete_penalty',
    'other'
  ))
);

-- Indexes for performance
CREATE INDEX idx_staff_activity_staff_id ON staff_activity_logs(staff_user_id);
CREATE INDEX idx_staff_activity_action_type ON staff_activity_logs(action_type);
CREATE INDEX idx_staff_activity_category ON staff_activity_logs(action_category);
CREATE INDEX idx_staff_activity_created_at ON staff_activity_logs(created_at DESC);
CREATE INDEX idx_staff_activity_metadata ON staff_activity_logs USING gin(metadata);

-- Enable Row Level Security
ALTER TABLE staff_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only admin and managers can view)
CREATE POLICY "Admin and managers can view all logs"
  ON staff_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
    )
  );

-- Allow system to insert logs
CREATE POLICY "System can insert activity logs"
  ON staff_activity_logs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE staff_activity_logs IS 'Tracks all staff member activities across the system';

