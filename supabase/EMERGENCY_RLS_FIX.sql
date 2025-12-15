-- Emergency fix to restore HR system access
-- This temporarily disables RLS on users table to fix the infinite recursion

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR Staff can view team profiles" ON users;
DROP POLICY IF EXISTS "HR system access" ON users;
DROP POLICY IF EXISTS "Simple users access" ON users;

-- Temporarily disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- This will restore access to the HR system immediately
-- You can re-enable RLS later with proper policies
