-- Add missing columns to hr_whatsapp_numbers table
-- This is a safer approach that preserves existing data

-- Add missing columns if they don't exist
ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';

-- Add assigned_staff_user_id column first without foreign key
ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS assigned_staff_user_id UUID;

-- Add hr_manager_user_id column first without foreign key  
ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS hr_manager_user_id UUID;

-- Now add the foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key for assigned_staff_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'hr_whatsapp_numbers_assigned_staff_user_id_fkey'
    ) THEN
        ALTER TABLE hr_whatsapp_numbers 
        ADD CONSTRAINT hr_whatsapp_numbers_assigned_staff_user_id_fkey 
        FOREIGN KEY (assigned_staff_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key for hr_manager_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'hr_whatsapp_numbers_hr_manager_user_id_fkey'
    ) THEN
        ALTER TABLE hr_whatsapp_numbers 
        ADD CONSTRAINT hr_whatsapp_numbers_hr_manager_user_id_fkey 
        FOREIGN KEY (hr_manager_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS callback_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_staff_id ON hr_whatsapp_numbers(assigned_staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_manager_id ON hr_whatsapp_numbers(hr_manager_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_status ON hr_whatsapp_numbers(status);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_phone ON hr_whatsapp_numbers(phone_number);

-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE hr_whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "HR Managers can view their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can insert WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can update their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can delete their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can view their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can update their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "Admins can do everything on hr_whatsapp_numbers" ON hr_whatsapp_numbers;

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
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_activities_number_id ON hr_whatsapp_activities(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_activities_staff_id ON hr_whatsapp_activities(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_activities_created_at ON hr_whatsapp_activities(created_at);

-- Enable RLS for hr_whatsapp_activities
ALTER TABLE hr_whatsapp_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "HR Staff can view their WhatsApp activities" ON hr_whatsapp_activities;
DROP POLICY IF EXISTS "HR Staff can create WhatsApp activities" ON hr_whatsapp_activities;
DROP POLICY IF EXISTS "HR Managers can view team WhatsApp activities" ON hr_whatsapp_activities;
DROP POLICY IF EXISTS "HR Managers can create team WhatsApp activities" ON hr_whatsapp_activities;
DROP POLICY IF EXISTS "Admins can do everything on hr_whatsapp_activities" ON hr_whatsapp_activities;

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
