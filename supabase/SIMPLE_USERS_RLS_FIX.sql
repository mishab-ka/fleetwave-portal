-- Simple fix for users table RLS policies
-- Remove all existing policies and create simple ones

-- Drop all existing policies on users table to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR Staff can view team profiles" ON users;
DROP POLICY IF EXISTS "HR system access" ON users;

-- Create a simple, non-recursive policy
-- This allows users to view their own profile and HR managers to view staff
CREATE POLICY "Simple users access" ON users
  FOR SELECT USING (
    -- Users can view their own profile
    id = auth.uid() OR
    -- HR managers can view their assigned staff (no self-reference)
    EXISTS (
      SELECT 1 FROM hr_staff_assignments hsa
      WHERE hsa.hr_manager_user_id = auth.uid()
      AND hsa.hr_staff_user_id = users.id
      AND hsa.is_active = true
    )
  );

-- Alternative: Temporarily disable RLS on users table for testing
-- Uncomment the line below if the above doesn't work
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
