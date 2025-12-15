-- Fix HR Staff Assignments Table
-- This script ensures the table has the correct structure for the HRStaffManagement component

-- Drop the existing table if it has the wrong structure
DROP TABLE IF EXISTS hr_staff_assignments CASCADE;

-- Create HR Staff Assignments table with correct structure
-- This links HR Managers to HR Staff directly using user IDs from auth.users
CREATE TABLE hr_staff_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hr_manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hr_staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique assignments (one staff member can only be assigned to one manager at a time)
  UNIQUE(hr_staff_user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_hr_staff_assignments_manager ON hr_staff_assignments(hr_manager_user_id);
CREATE INDEX idx_hr_staff_assignments_staff ON hr_staff_assignments(hr_staff_user_id);
CREATE INDEX idx_hr_staff_assignments_active ON hr_staff_assignments(is_active);

-- Enable Row Level Security
ALTER TABLE hr_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- HR Managers can view their own staff assignments
CREATE POLICY "HR Managers can view their staff assignments"
ON hr_staff_assignments
FOR SELECT
USING (
  hr_manager_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- HR Managers can insert staff assignments
CREATE POLICY "HR Managers can assign staff"
ON hr_staff_assignments
FOR INSERT
WITH CHECK (
  hr_manager_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- HR Managers can update their staff assignments
CREATE POLICY "HR Managers can update their staff assignments"
ON hr_staff_assignments
FOR UPDATE
USING (
  hr_manager_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- HR Managers can delete their staff assignments
CREATE POLICY "HR Managers can delete their staff assignments"
ON hr_staff_assignments
FOR DELETE
USING (
  hr_manager_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Create a function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_hr_staff_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_hr_staff_assignments_updated_at_trigger
BEFORE UPDATE ON hr_staff_assignments
FOR EACH ROW
EXECUTE FUNCTION update_hr_staff_assignments_updated_at();

