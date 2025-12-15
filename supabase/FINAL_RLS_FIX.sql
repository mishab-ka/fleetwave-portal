-- Final fix for RLS policies and WhatsApp functionality
-- This addresses both the 400 errors and staff name display issues

-- 1. Drop all existing policies on users table to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR Staff can view team profiles" ON users;
DROP POLICY IF EXISTS "HR system access" ON users;
DROP POLICY IF EXISTS "Simple users access" ON users;

-- 2. Temporarily disable RLS on users table to fix immediate access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Ensure hr_whatsapp_numbers table has all required columns
ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS assigned_staff_user_id UUID;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS hr_manager_user_id UUID;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS callback_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE hr_whatsapp_numbers 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_staff_id ON hr_whatsapp_numbers(assigned_staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_manager_id ON hr_whatsapp_numbers(hr_manager_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_status ON hr_whatsapp_numbers(status);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_phone ON hr_whatsapp_numbers(phone_number);

-- 5. Enable RLS on hr_whatsapp_numbers
ALTER TABLE hr_whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies on hr_whatsapp_numbers to avoid conflicts
DROP POLICY IF EXISTS "HR Managers can view their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can insert WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can update their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can delete their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can view their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can update their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "Admins can do everything on hr_whatsapp_numbers" ON hr_whatsapp_numbers;

-- 7. Create RLS policies for hr_whatsapp_numbers
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

-- 8. Create hr_whatsapp_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS hr_whatsapp_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number_id UUID REFERENCES hr_whatsapp_numbers(id) ON DELETE CASCADE,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- chat_initiated, status_change, note_added, etc.
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_activities_number_id ON hr_whatsapp_activities(whatsapp_number_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_activities_staff_user_id ON hr_whatsapp_activities(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_activities_created_at ON hr_whatsapp_activities(created_at);

-- Enable Row Level Security (RLS) for hr_whatsapp_activities
ALTER TABLE hr_whatsapp_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hr_whatsapp_activities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR Staff can view WhatsApp activities for their numbers' AND polrelid = 'hr_whatsapp_activities'::regclass) THEN
    CREATE POLICY "HR Staff can view WhatsApp activities for their numbers" ON hr_whatsapp_activities
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM hr_whatsapp_numbers hwn
          WHERE hwn.id = whatsapp_number_id
          AND hwn.assigned_staff_user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR Staff can create WhatsApp activities for their numbers' AND polrelid = 'hr_whatsapp_activities'::regclass) THEN
    CREATE POLICY "HR Staff can create WhatsApp activities for their numbers" ON hr_whatsapp_activities
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM hr_whatsapp_numbers hwn
          WHERE hwn.id = whatsapp_number_id
          AND hwn.assigned_staff_user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR Managers can view team WhatsApp activities' AND polrelid = 'hr_whatsapp_activities'::regclass) THEN
    CREATE POLICY "HR Managers can view team WhatsApp activities" ON hr_whatsapp_activities
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM hr_whatsapp_numbers hwn
          WHERE hwn.id = whatsapp_number_id
          AND hwn.hr_manager_user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'HR Managers can create team WhatsApp activities' AND polrelid = 'hr_whatsapp_activities'::regclass) THEN
    CREATE POLICY "HR Managers can create team WhatsApp activities" ON hr_whatsapp_activities
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM hr_whatsapp_numbers hwn
          WHERE hwn.id = whatsapp_number_id
          AND hwn.hr_manager_user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins can do everything on hr_whatsapp_activities' AND polrelid = 'hr_whatsapp_activities'::regclass) THEN
    CREATE POLICY "Admins can do everything on hr_whatsapp_activities" ON hr_whatsapp_activities
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role = 'admin'
        )
      );
  END IF;
END $$;
