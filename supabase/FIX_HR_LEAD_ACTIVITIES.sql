-- Fix HR Lead Activities Table
-- This fixes the error: "column hr_lead_activities.staff_user_id does not exist"

-- Drop existing table to recreate with correct structure
DROP TABLE IF EXISTS hr_lead_activities CASCADE;

-- Create HR Lead Activities table with correct columns
CREATE TABLE hr_lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES hr_leads(id) ON DELETE CASCADE,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_hr_lead_activities_lead ON hr_lead_activities(lead_id);
CREATE INDEX idx_hr_lead_activities_staff ON hr_lead_activities(staff_user_id);
CREATE INDEX idx_hr_lead_activities_type ON hr_lead_activities(activity_type);
CREATE INDEX idx_hr_lead_activities_created_at ON hr_lead_activities(created_at);

-- Enable Row Level Security
ALTER TABLE hr_lead_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- HR Staff can view activities for their own leads
CREATE POLICY "HR Staff can view their lead activities"
ON hr_lead_activities
FOR SELECT
USING (
  staff_user_id = auth.uid() OR
  lead_id IN (
    SELECT id FROM hr_leads 
    WHERE assigned_staff_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- HR Staff can create activities for their leads
CREATE POLICY "HR Staff can create activities"
ON hr_lead_activities
FOR INSERT
WITH CHECK (
  staff_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_staff', 'hr_manager', 'admin')
  )
);

-- HR Managers can view all activities for their team's leads
CREATE POLICY "HR Managers can view team activities"
ON hr_lead_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM hr_leads l
    WHERE l.id = hr_lead_activities.lead_id
    AND l.assigned_manager_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Grant permissions
GRANT ALL ON hr_lead_activities TO authenticated;

-- Add comment
COMMENT ON TABLE hr_lead_activities IS 
'Tracks all activities performed on HR leads (calls, status changes, notes, etc.)';

COMMENT ON COLUMN hr_lead_activities.staff_user_id IS 
'The user (staff/manager) who performed the activity';

COMMENT ON COLUMN hr_lead_activities.activity_type IS 
'Type of activity: call, status_change, note_added, email_sent, etc.';

