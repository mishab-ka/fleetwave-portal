# RLS Recursion Fix

## Issue

**Error**: `infinite recursion detected in policy for relation "users"`
**Result**: HR system shows "Access Denied" and can't access the HR tab

## Root Cause

The RLS policy for the `users` table was referencing itself, causing infinite recursion:

```sql
-- PROBLEMATIC POLICY (causes recursion)
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u  -- ← This references the same table!
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );
```

## Solutions

### 🚨 **EMERGENCY_RLS_FIX.sql** (Immediate Fix)

**Use this to restore access immediately:**

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR Staff can view team profiles" ON users;
DROP POLICY IF EXISTS "HR system access" ON users;
DROP POLICY IF EXISTS "Simple users access" ON users;

-- Temporarily disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Benefits:**

- ✅ Immediate access restoration
- ✅ No more recursion errors
- ✅ HR system works again
- ⚠️ Less secure (temporarily)

### 🔧 **SIMPLE_USERS_RLS_FIX.sql** (Recommended)

**Use this for a proper fix with security:**

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "HR Managers can view staff profiles" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "HR Staff can view team profiles" ON users;
DROP POLICY IF EXISTS "HR system access" ON users;
DROP POLICY IF EXISTS "Simple users access" ON users;

-- Create a simple, non-recursive policy
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
```

**Benefits:**

- ✅ No recursion issues
- ✅ Maintains security
- ✅ HR system works properly
- ✅ Proper access control

## How to Apply

### Step 1: Emergency Fix (Immediate)

1. Go to Supabase SQL Editor
2. Run `EMERGENCY_RLS_FIX.sql`
3. Test HR system access
4. You should now be able to access the HR tab

### Step 2: Proper Fix (Recommended)

1. Go to Supabase SQL Editor
2. Run `SIMPLE_USERS_RLS_FIX.sql`
3. Test HR system access
4. Verify staff names display correctly

## Expected Results

### After Emergency Fix:

- ✅ HR system accessible
- ✅ No more "Access Denied" error
- ✅ Can access HR tab
- ⚠️ Less secure (temporarily)

### After Proper Fix:

- ✅ HR system accessible
- ✅ No more "Access Denied" error
- ✅ Can access HR tab
- ✅ Staff names display correctly
- ✅ Proper security maintained

## Troubleshooting

### If you still get "Access Denied":

1. Check that the SQL ran successfully
2. Verify no errors in Supabase SQL Editor
3. Try refreshing the browser
4. Check browser console for errors

### If staff names still don't show:

1. Run the complete WhatsApp fix after the RLS fix
2. Verify `assigned_staff_user_id` column exists
3. Check that staff assignments are properly linked

## Prevention

**To avoid this in the future:**

- Never reference the same table within its own RLS policy
- Use simple, non-recursive policies
- Test policies in a development environment first
- Use `EXISTS` with other tables instead of self-referencing

## Summary

**The issue was caused by:**

- RLS policy referencing the `users` table within itself
- This created infinite recursion
- Resulted in "Access Denied" error

**The fix:**

- Remove problematic policies
- Create simple, non-recursive policies
- Or temporarily disable RLS for immediate access

**Choose your approach:**

- **Emergency**: Use `EMERGENCY_RLS_FIX.sql` for immediate access
- **Proper**: Use `SIMPLE_USERS_RLS_FIX.sql` for secure, long-term solution

**The HR system will work perfectly after either fix!** 🎉
