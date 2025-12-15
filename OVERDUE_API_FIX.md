# Overdue Users API - SQL Fix

## 🔧 Issue Fixed: "column reference 'user_id' is ambiguous"

The SQL function had ambiguous column references. This has been fixed.

---

## ✅ Solution

**Updated SQL file:** `supabase/GET_OVERDUE_USERS_API.sql`

**Changes made:**
- Qualified all column references with proper table/CTE aliases
- Fixed `DISTINCT ON` clause to use qualified column names
- Fixed JOIN conditions to use qualified column names

---

## 🚀 Action Required

### Step 1: Re-run SQL Script

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy the **entire** content of `supabase/GET_OVERDUE_USERS_API.sql`
4. Paste and click **"Run"**

This will recreate the functions with the fixed SQL.

### Step 2: Verify Function Works

Test in Supabase SQL Editor:
```sql
SELECT * FROM get_overdue_users(1);
```

If it returns data (or empty array), the function is working! ✅

### Step 3: Test in n8n

1. Go back to your n8n workflow
2. Execute the HTTP Request node again
3. It should work now!

---

## 🧪 Quick Test

Run this in Supabase SQL Editor to verify:

```sql
-- Test basic function
SELECT * FROM get_overdue_users(1) LIMIT 5;

-- Test with balance
SELECT * FROM get_overdue_users_with_balance(1) LIMIT 5;
```

---

## ✅ Expected Result

After re-running the SQL script, your n8n workflow should work correctly and return overdue users data.

---

**Status:** ✅ Fixed - Ready to use

