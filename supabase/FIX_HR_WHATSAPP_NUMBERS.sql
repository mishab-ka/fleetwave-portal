-- Fix HR WhatsApp Numbers table structure
-- Add missing columns for staff assignment and status tracking

-- Drop existing table to ensure clean structure
DROP TABLE IF EXISTS hr_whatsapp_numbers CASCADE;

-- Create HR WhatsApp Numbers table with proper structure
CREATE TABLE hr_whatsapp_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  assigned_staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hr_manager_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  callback_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_hr_whatsapp_numbers_staff_id ON hr_whatsapp_numbers(assigned_staff_user_id);
CREATE INDEX idx_hr_whatsapp_numbers_manager_id ON hr_whatsapp_numbers(hr_manager_user_id);
CREATE INDEX idx_hr_whatsapp_numbers_status ON hr_whatsapp_numbers(status);
CREATE INDEX idx_hr_whatsapp_numbers_phone ON hr_whatsapp_numbers(phone_number);

-- Enable Row Level Security (RLS)
ALTER TABLE hr_whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- HR Managers can view and manage their WhatsApp numbers
CREATE POLICY "HR Managers can view their WhatsApp numbers" ON hr_whatsapp_numbers
  FOR SELECT USING (hr_manager_user_id = auth.uid());

CREATE POLICY "HR Managers can insert WhatsApp numbers" ON hr_whatsapp_numbers
  FOR INSERT WITH CHECK (hr_manager_user_id = auth.uid());

CREATE POLICY "HR Managers can update their WhatsApp numbers" ON hr_whatsapp_numbers
  FOR UPDATE USING (hr_manager_user_id = auth.uid());

CREATE POLICY "HR Managers can delete their WhatsApp numbers" ON hr_whatsapp_numbers
  FOR DELETE USING (hr_manager_user_id = auth.uid());

-- HR Staff can view their assigned WhatsApp numbers
CREATE POLICY "HR Staff can view their assigned WhatsApp numbers" ON hr_whatsapp_numbers
  FOR SELECT USING (assigned_staff_user_id = auth.uid());

-- HR Staff can update their assigned WhatsApp numbers
CREATE POLICY "HR Staff can update their assigned WhatsApp numbers" ON hr_whatsapp_numbers
  FOR UPDATE USING (assigned_staff_user_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins can do everything on hr_whatsapp_numbers" ON hr_whatsapp_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for hr_whatsapp_numbers
CREATE TRIGGER update_hr_whatsapp_numbers_updated_at BEFORE UPDATE ON hr_whatsapp_numbers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create HR WhatsApp Activities table for tracking conversations
CREATE TABLE IF NOT EXISTS hr_whatsapp_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number_id UUID REFERENCES hr_whatsapp_numbers(id) ON DELETE CASCADE,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- chat_initiated, status_change, note_added, etc.
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for hr_whatsapp_activities
CREATE INDEX idx_hr_whatsapp_activities_number_id ON hr_whatsapp_activities(whatsapp_number_id);
CREATE INDEX idx_hr_whatsapp_activities_staff_id ON hr_whatsapp_activities(staff_user_id);
CREATE INDEX idx_hr_whatsapp_activities_created_at ON hr_whatsapp_activities(created_at);

-- Enable RLS for hr_whatsapp_activities
ALTER TABLE hr_whatsapp_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hr_whatsapp_activities
-- HR Staff can view activities for their WhatsApp numbers
CREATE POLICY "HR Staff can view their WhatsApp activities" ON hr_whatsapp_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hr_whatsapp_numbers wn
      WHERE wn.id = whatsapp_number_id
      AND wn.assigned_staff_user_id = auth.uid()
    )
  );

-- HR Staff can create activities for their WhatsApp numbers
CREATE POLICY "HR Staff can create WhatsApp activities" ON hr_whatsapp_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hr_whatsapp_numbers wn
      WHERE wn.id = whatsapp_number_id
      AND wn.assigned_staff_user_id = auth.uid()
    )
  );

-- HR Managers can view all activities for their WhatsApp numbers
CREATE POLICY "HR Managers can view team WhatsApp activities" ON hr_whatsapp_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hr_whatsapp_numbers wn
      WHERE wn.id = whatsapp_number_id
      AND wn.hr_manager_user_id = auth.uid()
    )
  );

-- HR Managers can create activities for their WhatsApp numbers
CREATE POLICY "HR Managers can create team WhatsApp activities" ON hr_whatsapp_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hr_whatsapp_numbers wn
      WHERE wn.id = whatsapp_number_id
      AND wn.hr_manager_user_id = auth.uid()
    )
  );

-- Admins can do everything on hr_whatsapp_activities
CREATE POLICY "Admins can do everything on hr_whatsapp_activities" ON hr_whatsapp_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );
