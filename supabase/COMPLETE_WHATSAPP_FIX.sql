-- Complete fix for WhatsApp functionality
-- This file addresses both the missing columns and RLS policy issues

-- 1. Add missing columns to hr_whatsapp_numbers table
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

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_staff_id ON hr_whatsapp_numbers(assigned_staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_manager_id ON hr_whatsapp_numbers(hr_manager_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_status ON hr_whatsapp_numbers(status);
CREATE INDEX IF NOT EXISTS idx_hr_whatsapp_numbers_phone ON hr_whatsapp_numbers(phone_number);

-- 3. Enable RLS on hr_whatsapp_numbers
ALTER TABLE hr_whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "HR Managers can view their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can insert WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can update their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Managers can delete their WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can view their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "HR Staff can update their assigned WhatsApp numbers" ON hr_whatsapp_numbers;
DROP POLICY IF EXISTS "Admins can do everything on hr_whatsapp_numbers" ON hr_whatsapp_numbers;

-- 5. Create RLS policies for hr_whatsapp_numbers
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

-- 6. Fix RLS policies for users table to allow HR staff queries
-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR Staff can view team profiles" ON users;

-- Create policies for users table
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- HR Managers can view staff profiles (for WhatsApp assignments)
CREATE POLICY "HR Managers can view staff profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hr_staff_assignments hsa
      WHERE hsa.hr_manager_user_id = auth.uid()
      AND hsa.hr_staff_user_id = users.id
      AND hsa.is_active = true
    )
  );

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- HR Staff can view their own profile and other staff profiles (for team visibility)
CREATE POLICY "HR Staff can view team profiles" ON users
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM hr_staff_assignments hsa1
      JOIN hr_staff_assignments hsa2 ON hsa1.hr_manager_user_id = hsa2.hr_manager_user_id
      WHERE hsa1.hr_staff_user_id = auth.uid()
      AND hsa2.hr_staff_user_id = users.id
      AND hsa1.is_active = true
      AND hsa2.is_active = true
    )
  );

-- 7. Create hr_whatsapp_activities table if it doesn't exist
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
