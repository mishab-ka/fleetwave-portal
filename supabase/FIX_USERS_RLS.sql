-- Fix RLS policies for users table to allow HR staff queries
-- This allows HR managers to fetch staff information for WhatsApp assignments

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

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
