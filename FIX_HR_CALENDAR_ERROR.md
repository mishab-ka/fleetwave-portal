# Fix HR Calendar Type Mismatch Error

## The Error

```
code: '42804'
message: 'structure of query does not match function result type'
details: 'Returned type text does not match expected type character varying in column 6.'
```

## The Problem

The `get_hr_calendar_data` database function returns columns with type `VARCHAR`, but PostgreSQL expects `TEXT`. This is a common type mismatch issue in PostgreSQL functions.

## The Solution

I've created a fixed version of the database function that uses `TEXT` types consistently.

---

## How to Fix

### Step 1: Run the SQL Script

**File:** `supabase/FIX_HR_CALENDAR_FUNCTION.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy all contents from `supabase/FIX_HR_CALENDAR_FUNCTION.sql`
3. Paste and click "Run"

### Step 2: Verify the Fix

After running the script, test the calendar:

1. Navigate to the HR Calendar page
2. The calendar should load without errors
3. You should see joining dates displayed on the calendar

---

## What the Fix Does

### Corrected Function Structure

The fixed function returns:

- `date` (TEXT) - Formatted as 'YYYY-MM-DD'
- `lead_name` (TEXT) - Name of the lead
- `status_name` (TEXT) - Status of the lead
- `status_color` (TEXT) - Color code for the status
- `staff_name` (TEXT) - Name of assigned staff (or 'Unassigned')

### Key Changes:

1. **All columns now return TEXT** (not VARCHAR)
2. **Date formatting** - Uses `to_char()` to format dates consistently
3. **Explicit type casting** - All values cast to `TEXT` explicitly
4. **COALESCE for safety** - Handles NULL values gracefully
5. **Security** - Uses `SECURITY DEFINER` for proper access control

---

## Complete Fix Package

You now have THREE SQL scripts to run in this order:

### 1. Fix Staff Assignments (if not done yet)

**File:** `supabase/FIX_HR_STAFF_ASSIGNMENTS.sql`

- Creates/fixes the `hr_staff_assignments` table
- Required for staff management

### 2. Fix Calendar Function (NEW)

**File:** `supabase/FIX_HR_CALENDAR_FUNCTION.sql`

- Fixes the calendar type mismatch error
- Required for calendar to work

### 3. (Optional) If you need the full HR system

**File:** `supabase/HR_SYSTEM_REDESIGNED.sql`

- Complete HR system setup
- Only run if you're setting up from scratch

---

## Quick Test After Fix

Run this query in Supabase SQL Editor to test:

```sql
SELECT * FROM get_hr_calendar_data(
  '2025-01-01'::DATE,
  '2025-12-31'::DATE
);
```

Expected result: Should return rows without errors (or empty if no joining dates)

---

## Summary

✅ **Created:** `supabase/FIX_HR_CALENDAR_FUNCTION.sql`  
✅ **Fixes:** Type mismatch error in calendar function  
✅ **Action Required:** Run the SQL script in Supabase Dashboard

Once you run the script, the HR Calendar will work perfectly! 🎉
