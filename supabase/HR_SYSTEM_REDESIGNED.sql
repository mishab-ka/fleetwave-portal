-- HR System Redesigned - Role-Based Access
-- This version works with existing users table and role system

-- Drop existing HR tables if they exist (for clean migration)
DROP TABLE IF EXISTS hr_lead_activities CASCADE;
DROP TABLE IF EXISTS hr_leads CASCADE;
DROP TABLE IF EXISTS hr_staff_assignments CASCADE;
DROP TABLE IF EXISTS hr_whatsapp_numbers CASCADE;
DROP TABLE IF EXISTS hr_lead_statuses CASCADE;

-- Drop existing HR-specific function if it exists
DROP FUNCTION IF EXISTS get_hr_calendar_data(DATE, DATE);

-- Create HR Staff Assignments table (for assigning leads to staff)
-- This links HR Managers to HR Staff for lead assignment
CREATE TABLE hr_staff_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hr_manager_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hr_staff_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WhatsApp Numbers table (for inquiry numbers)
-- HR Managers can add WhatsApp numbers for inquiries
CREATE TABLE hr_whatsapp_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hr_manager_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Lead Statuses table (for custom statuses)
CREATE TABLE hr_lead_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create HR Leads table (main leads table)
CREATE TABLE hr_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  status VARCHAR(50) DEFAULT 'new',
  source VARCHAR(100),
  assigned_staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  called_date TIMESTAMP WITH TIME ZONE,
  callback_date TIMESTAMP WITH TIME ZONE,
  joining_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Lead Activities table (for tracking activities)
CREATE TABLE hr_lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES hr_leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE hr_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_lead_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies - Role-Based Access

-- 1. Admin users can do everything
CREATE POLICY "Admins can do everything on hr_staff_assignments" ON hr_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can do everything on hr_whatsapp_numbers" ON hr_whatsapp_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can do everything on hr_lead_statuses" ON hr_lead_statuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can do everything on hr_leads" ON hr_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can do everything on hr_lead_activities" ON hr_lead_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- 2. HR Managers can manage everything
CREATE POLICY "HR Managers can manage staff assignments" ON hr_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

CREATE POLICY "HR Managers can manage WhatsApp numbers" ON hr_whatsapp_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

CREATE POLICY "HR Managers can manage lead statuses" ON hr_lead_statuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

CREATE POLICY "HR Managers can manage leads" ON hr_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

CREATE POLICY "HR Managers can manage lead activities" ON hr_lead_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

-- 3. HR Staff can only see their assigned leads
CREATE POLICY "HR Staff can view their assigned leads" ON hr_leads
  FOR SELECT USING (
    assigned_staff_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

CREATE POLICY "HR Staff can update their assigned leads" ON hr_leads
  FOR UPDATE USING (
    assigned_staff_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

CREATE POLICY "HR Staff can view lead statuses" ON hr_lead_statuses
  FOR SELECT USING (true);

CREATE POLICY "HR Staff can view lead activities for their leads" ON hr_lead_activities
  FOR SELECT USING (
    lead_id IN (
      SELECT l.id FROM hr_leads l
      WHERE l.assigned_staff_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

CREATE POLICY "HR Staff can create activities for their leads" ON hr_lead_activities
  FOR INSERT WITH CHECK (
    lead_id IN (
      SELECT l.id FROM hr_leads l
      WHERE l.assigned_staff_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'hr_manager'
    )
  );

-- Grant necessary permissions
GRANT ALL ON hr_staff_assignments TO authenticated;
GRANT ALL ON hr_whatsapp_numbers TO authenticated;
GRANT ALL ON hr_lead_statuses TO authenticated;
GRANT ALL ON hr_leads TO authenticated;
GRANT ALL ON hr_lead_activities TO authenticated;

-- Insert default lead statuses
INSERT INTO hr_lead_statuses (name, display_name, description, color, sort_order) VALUES
  ('new', 'New', 'New lead that needs initial contact', '#3b82f6', 1),
  ('contacted', 'Contacted', 'Lead has been contacted', '#10b981', 2),
  ('hot_lead', 'Hot Lead', 'High priority lead', '#f59e0b', 3),
  ('cold_lead', 'Cold Lead', 'Low priority lead', '#6b7280', 4),
  ('callback', 'Callback', 'Scheduled for callback', '#8b5cf6', 5),
  ('joined', 'Joined', 'Successfully joined', '#059669', 6),
  ('not_interested', 'Not Interested', 'Lead is not interested', '#dc2626', 7),
  ('call_not_picked', 'Call Not Picked', 'Call was not answered', '#ef4444', 8)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_hr_staff_assignments_manager ON hr_staff_assignments(hr_manager_user_id);
CREATE INDEX idx_hr_staff_assignments_staff ON hr_staff_assignments(hr_staff_user_id);
CREATE INDEX idx_hr_whatsapp_numbers_manager ON hr_whatsapp_numbers(hr_manager_user_id);
CREATE INDEX idx_hr_leads_assigned_staff ON hr_leads(assigned_staff_user_id);
CREATE INDEX idx_hr_leads_assigned_manager ON hr_leads(assigned_manager_user_id);
CREATE INDEX idx_hr_leads_status ON hr_leads(status);
CREATE INDEX idx_hr_lead_activities_lead_id ON hr_lead_activities(lead_id);

-- Create updated_at trigger function (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_hr_staff_assignments_updated_at BEFORE UPDATE ON hr_staff_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_whatsapp_numbers_updated_at BEFORE UPDATE ON hr_whatsapp_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_lead_statuses_updated_at BEFORE UPDATE ON hr_lead_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_leads_updated_at BEFORE UPDATE ON hr_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create calendar function for HR events
CREATE OR REPLACE FUNCTION get_hr_calendar_data(start_date DATE, end_date DATE)
RETURNS TABLE (
  id UUID,
  lead_name VARCHAR,
  phone VARCHAR,
  status VARCHAR,
  joining_date TIMESTAMP WITH TIME ZONE,
  staff_name VARCHAR,
  staff_phone VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name as lead_name,
    l.phone,
    l.status,
    l.joining_date,
    COALESCE(u.name, 'Unassigned') as staff_name,
    COALESCE(u.phone_number, '') as staff_phone
  FROM hr_leads l
  LEFT JOIN users u ON l.assigned_staff_user_id = u.id
  WHERE l.joining_date IS NOT NULL
    AND l.joining_date >= start_date
    AND l.joining_date <= end_date
  ORDER BY l.joining_date;
END;
$$ LANGUAGE plpgsql;
