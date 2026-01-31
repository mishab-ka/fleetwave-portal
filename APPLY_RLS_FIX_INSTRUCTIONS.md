# How to Fix RLS 403 Errors

## Problem
You're seeing 403 errors when trying to:
- Add penalty transactions (INSERT)
- View penalty transactions (SELECT)
- This affects Manager, Accountant, and Admin roles

## Solution
Run the SQL fix file `ENABLE_TRANSACTION_AND_REPORT_ACCESS.sql` in Supabase.

## Steps to Apply the Fix

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **SQL Editor** (left sidebar)

### 2. Run the SQL Fix
- Click **New Query**
- Copy the entire contents of `ENABLE_TRANSACTION_AND_REPORT_ACCESS.sql`
- Paste it into the SQL Editor
- Click **Run** (or press Ctrl+Enter)

### 3. Verify the Fix
After running, you should see:
- A list of all created policies
- Your current user's role and permissions
- Policy count per table

### 4. Test the Application
1. Refresh your browser
2. Try adding a penalty transaction as a Manager/Accountant
3. The 403 error should be gone

## What This Fix Does

✅ **Enables INSERT** for Admin, Manager, Accountant on:
- `driver_penalty_transactions`
- `driver_balance_transactions`
- `fleet_reports`
- `vehicle_audits`

✅ **Enables SELECT** for:
- Users can see their own data
- Staff (Admin, Manager, Accountant) can see all data

✅ **Restricts DELETE** to:
- Only Admin and Super Admin

## If You Still See Errors

1. **Check your role**: Make sure your user has the correct role in the `users` table
   ```sql
   SELECT id, email, role FROM users WHERE id = auth.uid();
   ```

2. **Verify policies exist**:
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
   AND schemaname = 'public';
   ```

3. **Check RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('driver_penalty_transactions', 'driver_balance_transactions');
   ```

## Important Notes

- The SQL file will **drop all existing policies** before creating new ones
- This ensures no conflicting policies remain
- All data is safe - this only changes permissions, not data

