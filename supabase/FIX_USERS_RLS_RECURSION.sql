-- Fix infinite recursion in users table RLS policies
-- The issue is that the policy references the users table within itself

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR Staff can view team profiles" ON users;

-- Create simplified policies that don't cause recursion
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- HR Managers can view staff profiles (simplified - no self-reference)
CREATE POLICY "HR Managers can view staff profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hr_staff_assignments hsa
      WHERE hsa.hr_manager_user_id = auth.uid()
      AND hsa.hr_staff_user_id = users.id
      AND hsa.is_active = true
    )
  );

-- Admins can view all users (simplified - check role directly)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- HR Staff can view their own profile and other staff profiles
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

-- Alternative: Create a more permissive policy for HR system access
-- This allows HR managers and staff to view user profiles needed for the system
CREATE POLICY "HR system access" ON users
  FOR SELECT USING (
    -- Users can view their own profile
    id = auth.uid() OR
    -- HR managers can view their assigned staff
    EXISTS (
      SELECT 1 FROM hr_staff_assignments hsa
      WHERE hsa.hr_manager_user_id = auth.uid()
      AND hsa.hr_staff_user_id = users.id
      AND hsa.is_active = true
    ) OR
    -- HR staff can view their team members
    EXISTS (
      SELECT 1 FROM hr_staff_assignments hsa1
      JOIN hr_staff_assignments hsa2 ON hsa1.hr_manager_user_id = hsa2.hr_manager_user_id
      WHERE hsa1.hr_staff_user_id = auth.uid()
      AND hsa2.hr_staff_user_id = users.id
      AND hsa1.is_active = true
      AND hsa2.is_active = true
    ) OR
    -- Admins can view all users
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
