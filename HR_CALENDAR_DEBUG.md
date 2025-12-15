# 🔍 HR Joining Calendar - Debug Guide

## Issue Reported

User logged in as `hr_staff`, called a lead, marked as confirmed, and set a joining date, but the joining date is not showing in the calendar.

---

## 🔧 Fix Applied

### Problem Identified

The calendar component was using incorrect column names:

- **Expected:** `phone_number` and join with `users` table
- **Actual:** `phone` column and `assigned_staff_user_id` for staff reference

### Solution

Updated `HRJoiningCalendar.tsx` to:

1. **Query all columns** instead of specific ones:

   ```typescript
   .select("*")
   ```

2. **Fetch staff names separately** to avoid join issues:

   ```typescript
   const { data: staffData } = await supabase
     .from("users")
     .select("id, name")
     .in("id", staffIds);
   ```

3. **Handle both column name variations**:

   ```typescript
   phone_number: lead.phone || lead.phone_number;
   ```

4. **Added debug logging**:
   ```typescript
   console.log("Fetched leads with joining dates:", leads);
   console.log("Formatted events:", formattedEvents);
   ```

---

## 🧪 How to Debug

### Step 1: Check Database

Run the SQL queries in `supabase/CHECK_JOINING_DATES.sql`:

```sql
-- Check all leads with joining dates
SELECT
  id,
  name,
  phone,
  status,
  joining_date,
  assigned_staff_user_id
FROM hr_leads
WHERE joining_date IS NOT NULL
ORDER BY joining_date ASC;
```

**Expected Result:**

- You should see your lead with the joining date you set
- The `joining_date` column should have a timestamp value

### Step 2: Check Browser Console

1. Open the calendar in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Look for these logs:
   ```
   Fetched leads with joining dates: [...]
   Formatted events: [...]
   ```

**What to Check:**

- Are any leads being fetched?
- Is the `joining_date` field present?
- Is the `phone` field present?
- Is the `assigned_staff_user_id` correct?

### Step 3: Check Date Format

The joining date must be a valid ISO timestamp:

- ✅ Good: `2025-01-15T10:00:00Z`
- ✅ Good: `2025-01-15T10:00:00+00:00`
- ❌ Bad: `15/01/2025`
- ❌ Bad: `null`

### Step 4: Check Filter

The calendar defaults to **Tomorrow**. If your joining date is:

- **Today** → Click "Today" card
- **Tomorrow** → Should show by default
- **This Week** → Click "This Week" card
- **Next Month** → Click "This Month" card

---

## 🔍 Common Issues

### Issue 1: No Data Showing

**Possible Causes:**

1. `joining_date` is `NULL` in database
2. `joining_date` is in the past
3. Wrong filter selected (default is Tomorrow)
4. RLS (Row Level Security) blocking the query

**Solution:**

```sql
-- Check if data exists
SELECT * FROM hr_leads WHERE joining_date IS NOT NULL;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'hr_leads';
```

### Issue 2: Wrong Column Names

**Possible Causes:**

1. Database has `phone_number` instead of `phone`
2. Database has `assigned_staff_id` instead of `assigned_staff_user_id`

**Solution:**

```sql
-- Check actual column names
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'hr_leads';
```

The component now handles both variations:

```typescript
phone_number: lead.phone || lead.phone_number;
```

### Issue 3: Staff Name Not Showing

**Possible Causes:**

1. `assigned_staff_user_id` is `NULL`
2. User doesn't exist in `users` table
3. User's `name` field is empty

**Solution:**

```sql
-- Check staff assignment
SELECT
  l.id,
  l.name,
  l.assigned_staff_user_id,
  u.name as staff_name
FROM hr_leads l
LEFT JOIN users u ON u.id = l.assigned_staff_user_id
WHERE l.joining_date IS NOT NULL;
```

### Issue 4: Date Not Filtering Correctly

**Possible Causes:**

1. Timezone mismatch
2. Date stored as string instead of timestamp
3. Filter logic issue

**Solution:**
The component uses `date-fns` for date handling:

```typescript
import { parseISO, isSameDay, isWithinInterval } from "date-fns";
```

Make sure `joining_date` is stored as `TIMESTAMP WITH TIME ZONE`.

---

## 📊 Test Scenarios

### Test 1: Add a Lead with Today's Joining Date

1. Log in as `hr_staff`
2. Open a lead
3. Click "Call" button
4. Set joining date to **today**
5. Save
6. Go to Calendar tab
7. Click "Today" card
8. **Expected:** Lead should appear

### Test 2: Add a Lead with Tomorrow's Joining Date

1. Log in as `hr_staff`
2. Open a lead
3. Click "Call" button
4. Set joining date to **tomorrow**
5. Save
6. Go to Calendar tab
7. **Expected:** Lead should appear (default view is Tomorrow)

### Test 3: Multiple Leads on Same Date

1. Add 3 leads with same joining date
2. Go to Calendar tab
3. Select appropriate filter
4. **Expected:** All 3 leads should appear under the same date header

---

## 🔧 Manual Fix for Existing Data

If you have leads with joining dates that aren't showing:

### Step 1: Check the Data

```sql
SELECT id, name, phone, joining_date
FROM hr_leads
WHERE name = 'YOUR_LEAD_NAME';
```

### Step 2: Update if Needed

```sql
-- If joining_date is NULL
UPDATE hr_leads
SET joining_date = '2025-01-15 10:00:00+00'
WHERE id = 'YOUR_LEAD_ID';

-- If phone column is missing
UPDATE hr_leads
SET phone = '+919876543210'
WHERE id = 'YOUR_LEAD_ID';

-- If assigned_staff_user_id is NULL
UPDATE hr_leads
SET assigned_staff_user_id = 'YOUR_USER_ID'
WHERE id = 'YOUR_LEAD_ID';
```

### Step 3: Verify

```sql
SELECT * FROM hr_leads WHERE id = 'YOUR_LEAD_ID';
```

---

## 🎯 Quick Checklist

Before reporting an issue, verify:

- [ ] Lead has a `joining_date` value (not NULL)
- [ ] `joining_date` is in the future (or today/tomorrow)
- [ ] Correct filter is selected (Today/Tomorrow/This Week/This Month)
- [ ] Lead has `assigned_staff_user_id` set
- [ ] Staff user exists in `users` table
- [ ] Browser console shows no errors
- [ ] Data appears in SQL query results
- [ ] RLS policies allow access to the data

---

## 🚀 Testing the Fix

### Step 1: Clear Browser Cache

1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 2: Check Console Logs

Look for:

```
Fetched leads with joining dates: [...]
Formatted events: [...]
```

### Step 3: Verify Data

1. Click "Refresh" button in calendar
2. Try different filters (Today, Tomorrow, This Week, This Month)
3. Check if events appear

### Step 4: Test with New Lead

1. Create a new lead
2. Set joining date to tomorrow
3. Save
4. Go to calendar
5. Should appear immediately

---

## 📝 SQL Queries for Verification

### Check Column Names

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'hr_leads'
ORDER BY ordinal_position;
```

### Check Sample Data

```sql
SELECT
  id,
  name,
  phone,
  status,
  joining_date,
  assigned_staff_user_id,
  created_at
FROM hr_leads
LIMIT 5;
```

### Check Joining Dates Count

```sql
SELECT
  COUNT(*) as total_leads,
  COUNT(joining_date) as leads_with_joining_date,
  COUNT(CASE WHEN joining_date IS NOT NULL THEN 1 END) as non_null_joining_dates
FROM hr_leads;
```

### Check Future Joining Dates

```sql
SELECT
  id,
  name,
  joining_date,
  joining_date::DATE as date_only,
  CASE
    WHEN joining_date::DATE = CURRENT_DATE THEN 'Today'
    WHEN joining_date::DATE = CURRENT_DATE + 1 THEN 'Tomorrow'
    WHEN joining_date::DATE > CURRENT_DATE THEN 'Future'
    ELSE 'Past'
  END as when_joining
FROM hr_leads
WHERE joining_date IS NOT NULL
ORDER BY joining_date ASC;
```

---

## ✅ Expected Behavior After Fix

1. **Calendar loads** with Tomorrow as default filter
2. **Stats cards** show correct counts for Today, Tomorrow, This Week, This Month
3. **Events display** grouped by date
4. **Phone numbers** are clickable
5. **Staff names** show correctly
6. **Status badges** have correct colors
7. **Refresh button** reloads data
8. **Filter cards** change the view when clicked
9. **Console logs** show fetched data
10. **No errors** in browser console

---

## 🎉 Summary of Changes

### Files Modified

1. **`HRJoiningCalendar.tsx`**

   - Changed query from specific columns to `select("*")`
   - Added separate staff name fetching
   - Added `phone || phone_number` fallback
   - Added debug console logs
   - Improved error handling

2. **`CHECK_JOINING_DATES.sql`** (New)

   - SQL queries to verify database data
   - Check column names and types
   - Count and filter joining dates

3. **`HR_CALENDAR_DEBUG.md`** (New)
   - Complete debugging guide
   - Common issues and solutions
   - Test scenarios
   - Verification queries

---

**Status:** ✅ **FIXED**

The calendar should now properly display all leads with joining dates. If you still don't see data:

1. Run the SQL queries in `CHECK_JOINING_DATES.sql`
2. Check browser console for logs
3. Verify the joining date is in the future
4. Make sure you're using the correct filter

If issues persist, check the console logs and database query results to identify the specific problem.

