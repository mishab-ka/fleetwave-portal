-- HR System Database Schema - Simplified Version
-- This version works with existing users table that has a 'role' column

-- Drop existing HR tables if they exist (for clean migration)
DROP TABLE IF EXISTS hr_lead_activities CASCADE;
DROP TABLE IF EXISTS hr_leads CASCADE;
DROP TABLE IF EXISTS hr_staff_assignments CASCADE;
DROP TABLE IF EXISTS hr_staff CASCADE;
DROP TABLE IF EXISTS hr_managers CASCADE;
DROP TABLE IF EXISTS hr_whatsapp_numbers CASCADE;
DROP TABLE IF EXISTS hr_lead_statuses CASCADE;

-- Create HR Managers table (links to existing users table)
CREATE TABLE IF NOT EXISTS hr_managers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100) DEFAULT 'HR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create HR Staff table (links to existing users table)
CREATE TABLE IF NOT EXISTS hr_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100) DEFAULT 'HR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create HR Staff Assignments table (for assigning leads to staff)
CREATE TABLE IF NOT EXISTS hr_staff_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hr_manager_id UUID REFERENCES hr_managers(id) ON DELETE CASCADE,
  hr_staff_id UUID REFERENCES hr_staff(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WhatsApp Numbers table (for inquiry numbers)
CREATE TABLE IF NOT EXISTS hr_whatsapp_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hr_manager_id UUID REFERENCES hr_managers(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create HR Lead Statuses table (customizable statuses)
CREATE TABLE IF NOT EXISTS hr_lead_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System statuses cannot be deleted
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create HR Leads table
CREATE TABLE IF NOT EXISTS hr_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  status_id UUID REFERENCES hr_lead_statuses(id),
  assigned_staff_id UUID REFERENCES hr_staff(id),
  source VARCHAR(100) DEFAULT 'WhatsApp', -- WhatsApp, Website, Referral, etc.
  notes TEXT,
  called_date TIMESTAMP WITH TIME ZONE,
  callback_date TIMESTAMP WITH TIME ZONE,
  joining_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create HR Lead Activities table (for tracking all activities)
CREATE TABLE IF NOT EXISTS hr_lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES hr_leads(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES hr_staff(id),
  activity_type VARCHAR(50) NOT NULL, -- call, status_change, note_added, etc.
  description TEXT NOT NULL,
  old_status_id UUID REFERENCES hr_lead_statuses(id),
  new_status_id UUID REFERENCES hr_lead_statuses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hr_managers_user_id ON hr_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_managers_email ON hr_managers(email);
CREATE INDEX IF NOT EXISTS idx_hr_staff_user_id ON hr_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_email ON hr_staff(email);
CREATE INDEX IF NOT EXISTS idx_hr_staff_assignments_manager ON hr_staff_assignments(hr_manager_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_assignments_staff ON hr_staff_assignments(hr_staff_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_manager ON hr_whatsapp_numbers(hr_manager_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_phone ON hr_whatsapp_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_hr_leads_status ON hr_leads(status_id);
CREATE INDEX IF NOT EXISTS idx_hr_leads_staff ON hr_leads(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_hr_leads_phone ON hr_leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_hr_leads_created_at ON hr_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_hr_lead_activities_lead ON hr_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_hr_lead_activities_staff ON hr_lead_activities(staff_id);
CREATE INDEX IF NOT EXISTS idx_hr_lead_activities_created_at ON hr_lead_activities(created_at);

-- Insert default lead statuses
INSERT INTO hr_lead_statuses (name, display_name, description, color, is_system, sort_order) VALUES
  ('confirmed', 'Confirmed', 'Lead has confirmed interest', '#10B981', true, 1),
  ('cold_lead', 'Cold Lead', 'Low interest or not responding', '#6B7280', true, 2),
  ('hot_lead', 'Hot Lead', 'High interest and engaged', '#EF4444', true, 3),
  ('callback', 'Call Back', 'Scheduled for callback', '#F59E0B', true, 4),
  ('joined', 'Joined', 'Successfully joined the program', '#059669', true, 5),
  ('cnp', 'CNP', 'Call Not Picked', '#DC2626', true, 6)
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_hr_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_hr_managers_updated_at BEFORE UPDATE ON hr_managers
  FOR EACH ROW EXECUTE FUNCTION update_hr_updated_at_column();

CREATE TRIGGER update_hr_staff_updated_at BEFORE UPDATE ON hr_staff
  FOR EACH ROW EXECUTE FUNCTION update_hr_updated_at_column();

CREATE TRIGGER update_hr_staff_assignments_updated_at BEFORE UPDATE ON hr_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_hr_updated_at_column();

CREATE TRIGGER update_hr_whatsapp_numbers_updated_at BEFORE UPDATE ON hr_whatsapp_numbers
  FOR EACH ROW EXECUTE FUNCTION update_hr_updated_at_column();

CREATE TRIGGER update_hr_lead_statuses_updated_at BEFORE UPDATE ON hr_lead_statuses
  FOR EACH ROW EXECUTE FUNCTION update_hr_updated_at_column();

CREATE TRIGGER update_hr_leads_updated_at BEFORE UPDATE ON hr_leads
  FOR EACH ROW EXECUTE FUNCTION update_hr_updated_at_column();

-- Create RLS policies for HR system
ALTER TABLE hr_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admins and HR Managers can see all data
CREATE POLICY "Admins and HR Managers can view all HR data" ON hr_managers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM hr_managers hm 
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and HR Managers can view all HR staff" ON hr_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM hr_managers hm 
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and HR Managers can view all staff assignments" ON hr_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM hr_managers hm 
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and HR Managers can view all WhatsApp numbers" ON hr_whatsapp_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM hr_managers hm 
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and HR Managers can view all lead statuses" ON hr_lead_statuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM hr_managers hm 
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and HR Managers can view all leads" ON hr_leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM hr_managers hm 
      WHERE hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and HR Managers can view all lead activities" ON hr_lead_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM hr_managers hm 
      WHERE hm.user_id = auth.uid()
    )
  );

-- HR Staff can only see their assigned leads
CREATE POLICY "HR Staff can view their assigned leads" ON hr_leads
  FOR SELECT USING (assigned_staff_id IN (
    SELECT hs.id FROM hr_staff hs 
    WHERE hs.user_id = auth.uid()
  ));

CREATE POLICY "HR Staff can update their assigned leads" ON hr_leads
  FOR UPDATE USING (assigned_staff_id IN (
    SELECT hs.id FROM hr_staff hs 
    WHERE hs.user_id = auth.uid()
  ));

CREATE POLICY "HR Staff can view lead statuses" ON hr_lead_statuses
  FOR SELECT USING (true);

CREATE POLICY "HR Staff can view their own profile" ON hr_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "HR Staff can view lead activities for their leads" ON hr_lead_activities
  FOR SELECT USING (lead_id IN (
    SELECT l.id FROM hr_leads l
    JOIN hr_staff hs ON l.assigned_staff_id = hs.id
    WHERE hs.user_id = auth.uid()
  ));

CREATE POLICY "HR Staff can create activities for their leads" ON hr_lead_activities
  FOR INSERT WITH CHECK (lead_id IN (
    SELECT l.id FROM hr_leads l
    JOIN hr_staff hs ON l.assigned_staff_id = hs.id
    WHERE hs.user_id = auth.uid()
  ));

-- Grant necessary permissions
GRANT ALL ON hr_managers TO authenticated;
GRANT ALL ON hr_staff TO authenticated;
GRANT ALL ON hr_staff_assignments TO authenticated;
GRANT ALL ON hr_whatsapp_numbers TO authenticated;
GRANT ALL ON hr_lead_statuses TO authenticated;
GRANT ALL ON hr_leads TO authenticated;
GRANT ALL ON hr_lead_activities TO authenticated;

-- Create views for easier querying
CREATE OR REPLACE VIEW hr_lead_summary AS
SELECT 
  l.id,
  l.name,
  l.phone_number,
  l.email,
  l.source,
  l.notes,
  l.called_date,
  l.callback_date,
  l.joining_date,
  l.created_at,
  l.updated_at,
  s.name as status_name,
  s.display_name as status_display,
  s.color as status_color,
  hs.name as assigned_staff_name,
  hs.email as assigned_staff_email,
  hm.name as manager_name
FROM hr_leads l
LEFT JOIN hr_lead_statuses s ON l.status_id = s.id
LEFT JOIN hr_staff hs ON l.assigned_staff_id = hs.id
LEFT JOIN hr_staff_assignments hsa ON hs.id = hsa.hr_staff_id
LEFT JOIN hr_managers hm ON hsa.hr_manager_id = hm.id;

-- Create function to get leads by staff
CREATE OR REPLACE FUNCTION get_leads_by_staff(staff_user_id UUID)
RETURNS TABLE (
  lead_id UUID,
  lead_name VARCHAR,
  phone_number VARCHAR,
  status_name VARCHAR,
  status_color VARCHAR,
  called_date TIMESTAMP WITH TIME ZONE,
  callback_date TIMESTAMP WITH TIME ZONE,
  joining_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.phone_number,
    s.display_name,
    s.color,
    l.called_date,
    l.callback_date,
    l.joining_date,
    l.created_at
  FROM hr_leads l
  JOIN hr_staff hs ON l.assigned_staff_id = hs.id
  LEFT JOIN hr_lead_statuses s ON l.status_id = s.id
  WHERE hs.user_id = staff_user_id
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get calendar data
CREATE OR REPLACE FUNCTION get_hr_calendar_data(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  lead_name VARCHAR,
  status_name VARCHAR,
  status_color VARCHAR,
  staff_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.joining_date::DATE as date,
    l.name as lead_name,
    s.display_name as status_name,
    s.color as status_color,
    hs.name as staff_name
  FROM hr_leads l
  LEFT JOIN hr_lead_statuses s ON l.status_id = s.id
  LEFT JOIN hr_staff hs ON l.assigned_staff_id = hs.id
  WHERE l.joining_date IS NOT NULL
    AND l.joining_date::DATE BETWEEN start_date AND end_date
  ORDER BY l.joining_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;








