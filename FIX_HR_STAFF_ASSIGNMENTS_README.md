# Fix HR Staff Assignments Table

## Problem

The error you're getting:

```
"Could not find a relationship between 'hr_staff_assignments' and 'users' in the schema cache"
```

This happens because the `hr_staff_assignments` table either:

1. Doesn't exist in your database
2. Has an old structure that doesn't match the current code

## Solution

You need to run the SQL script to create/fix the `hr_staff_assignments` table.

### Steps to Fix:

1. **Open Supabase Dashboard**

   - Go to your project at [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to the SQL Editor

2. **Run the Fix Script**

   - Open the file: `supabase/FIX_HR_STAFF_ASSIGNMENTS.sql`
   - Copy all the contents
   - Paste it into the Supabase SQL Editor
   - Click "Run" to execute

3. **Verify the Table**
   After running the script, you can verify by running:
   ```sql
   SELECT * FROM hr_staff_assignments;
   ```

### What This Script Does:

1. **Drops the old table** (if it exists with wrong structure)
2. **Creates new table** with correct columns:

   - `id` - Primary key
   - `hr_manager_user_id` - References auth.users (the HR Manager)
   - `hr_staff_user_id` - References auth.users (the HR Staff member)
   - `assigned_at` - When the assignment was made
   - `is_active` - Whether the assignment is active
   - `created_at` / `updated_at` - Timestamps

3. **Creates indexes** for better performance
4. **Sets up RLS policies** so HR Managers can only see their own assignments
5. **Creates automatic timestamp update trigger**

### Table Structure:

```
hr_staff_assignments
├── id (UUID, Primary Key)
├── hr_manager_user_id (UUID) → references auth.users
├── hr_staff_user_id (UUID) → references auth.users
├── assigned_at (Timestamp)
├── is_active (Boolean)
├── created_at (Timestamp)
└── updated_at (Timestamp)
```

### After Running the Script:

Your HR Staff Management page should work correctly! The component will:

- Fetch staff assignments for the logged-in HR Manager
- Show assigned staff in small cards
- Allow assigning new staff members
- Allow removing staff assignments

### Testing:

1. Make sure you have users with role `hr_manager` and `hr_staff` in your `users` table
2. Log in as an HR Manager
3. Try to assign an HR Staff member
4. The cards should display correctly without any database errors
