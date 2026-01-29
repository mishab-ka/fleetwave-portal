# How to Fix 403 Error (42501) - Step by Step

## The Problem
You're getting a 403 error with code 42501 when trying to add transactions as a manager. This means RLS (Row Level Security) is blocking the insert.

## The Solution

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the SQL Fix
1. Open the file `FIX_403_ERROR_NOW.sql`
2. Copy the **ENTIRE** contents
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Check the Results
After running, look at the output:

**First Query Result: "Your Current Role"**
- If it shows "✅ Manager - Good!" → Your role is correct, continue
- If it shows "❌ WRONG ROLE" → You need to fix your role (see Step 4)

**Last Query Result: "Final Test"**
- If it shows "✅ SUCCESS - You can now insert transactions!" → Everything is fixed!
- If it shows "❌ FAILED" → Your role is wrong, fix it (see Step 4)

### Step 4: Fix Your Role (If Needed)
If the role check shows "❌ WRONG ROLE", run this in SQL Editor:

```sql
UPDATE public.users 
SET role = 'manager' 
WHERE id = auth.uid();
```

Then:
1. Refresh your browser
2. Try adding a transaction again

### Step 5: Test
1. **Refresh your browser** (very important!)
2. Try adding a penalty transaction
3. Try adding a balance transaction

Both should work now!

## What the SQL Does
- Checks your current role
- Removes all old conflicting policies
- Creates new INSERT policies that allow manager, accountant, and admin
- Creates SELECT, UPDATE, and DELETE policies
- Verifies everything is working

## If It Still Doesn't Work

1. **Check your role again:**
```sql
SELECT id, email, role FROM public.users WHERE id = auth.uid();
```

2. **Make sure role is exactly 'manager' (lowercase, no spaces)**

3. **Update role if needed:**
```sql
UPDATE public.users SET role = 'manager' WHERE id = auth.uid();
```

4. **Clear browser cache and refresh**

5. **Try again**

## Common Issues

- **Role is NULL** → Update it to 'manager'
- **Role is 'user' or 'driver'** → Update it to 'manager'
- **Still getting error after fix** → Make sure you refreshed your browser
- **Policies not created** → Re-run the SQL file

## Need Help?
If you're still having issues, check:
1. What role does the SQL output show?
2. What does the "Final Test" result show?
3. Did you refresh your browser after running the SQL?

