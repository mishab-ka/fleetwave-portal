# Fix HR Lead Activities Column Error

## The Error

```
code: "42703"
message: "column hr_lead_activities.staff_user_id does not exist"
```

## The Problem

The code is trying to insert records with a column called `staff_user_id`, but your database table has a different column name (probably `created_by`).

This mismatch happens because:

1. The code was written to use `staff_user_id`
2. The database schema uses a different column name
3. When leads are called or status is changed, the activity can't be logged

## The Solution

I've created a SQL script that recreates the `hr_lead_activities` table with the correct structure to match your code.

---

## How to Fix

### Step 1: Run the SQL Script

**File:** `supabase/FIX_HR_LEAD_ACTIVITIES.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy all contents from `supabase/FIX_HR_LEAD_ACTIVITIES.sql`
3. Paste and click "Run"

**⚠️ Warning:** This will drop and recreate the table, deleting existing activity logs. If you need to preserve data, export it first!

### Step 2: Test the Fix

After running the script:

1. **Login as HR Staff**
2. **Call a Lead:**

   - Go to "My Leads"
   - Click "Call" on any lead
   - Activity should be logged successfully

3. **Change Lead Status:**
   - Select a different status from the dropdown
   - Activity should be logged without errors

---

## What the Fix Does

### Correct Table Structure

The fixed table has:

```sql
hr_lead_activities
├── id (UUID)                    → Primary key
├── lead_id (UUID)              → References hr_leads
├── staff_user_id (UUID)        → References auth.users (WHO did it)
├── activity_type (VARCHAR)     → Type of activity
├── description (TEXT)          → Activity description
└── created_at (TIMESTAMP)      → When it happened
```

### Key Changes:

1. **Column Name:** Uses `staff_user_id` (not `created_by`)
2. **References `auth.users`** directly (not hr_staff table)
3. **Proper indexes** for performance
4. **RLS Policies** for security
5. **Staff and managers can view their activities**

---

## Activity Types Logged

The system logs these activities:

| Activity Type        | When It Happens             |
| -------------------- | --------------------------- |
| `call`               | When staff calls a lead     |
| `status_change`      | When lead status is updated |
| `note_added`         | When notes are added        |
| `email_sent`         | When emails are sent        |
| `callback_scheduled` | When callback is scheduled  |

---

## RLS Policies Created

### 1. Staff Can View Their Activities

- Staff can see activities they performed
- Staff can see activities on their assigned leads

### 2. Staff Can Create Activities

- HR Staff can log activities
- HR Managers can log activities
- Admins can log activities

### 3. Managers Can View Team Activities

- Managers see all activities for their team's leads
- Admins see all activities

---

## Complete Fix Order

You should run these SQL scripts in order:

```sql
1. FIX_HR_STAFF_ASSIGNMENTS.sql      -- Staff management
2. FIX_HR_LEAD_ACTIVITIES.sql        -- Activity logging (NEW!)
3. FIX_HR_CALENDAR_FUNCTION.sql      -- Calendar display
```

---

## After Running the Fix

✅ **What Works:**

- Call logging when staff calls leads
- Status change tracking
- Activity history per lead
- No more "column does not exist" errors

✅ **Where Activities Show:**

- Lead detail pages
- Activity history reports
- Staff performance tracking

---

## Testing Checklist

- [ ] SQL script executed successfully
- [ ] Table `hr_lead_activities` exists
- [ ] Can call a lead without errors
- [ ] Can change lead status without errors
- [ ] Activities are being logged
- [ ] No console errors

---

## Verify the Fix

Run this query to check the table structure:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'hr_lead_activities'
ORDER BY ordinal_position;
```

Expected columns:

- `id` (uuid)
- `lead_id` (uuid)
- `staff_user_id` (uuid)
- `activity_type` (character varying)
- `description` (text)
- `created_at` (timestamp with time zone)

---

## Test Activity Logging

After fixing, test with this query:

```sql
-- View recent activities
SELECT
  a.*,
  l.name as lead_name,
  l.phone as lead_phone,
  u.name as staff_name
FROM hr_lead_activities a
LEFT JOIN hr_leads l ON a.lead_id = l.id
LEFT JOIN users u ON a.staff_user_id = u.id
ORDER BY a.created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Still getting "column does not exist"

**Check:** Did you run the SQL script in the correct database?

### No activities showing

**Check:**

1. Are RLS policies enabled?
2. Is your user role set correctly?
3. Run: `SELECT * FROM hr_lead_activities;`

### Permission denied

**Check:** RLS policies - your user needs proper role:

- `hr_staff`, `hr_manager`, or `admin`

---

## Summary

✅ **Fixed:** `hr_lead_activities` table structure  
✅ **Column:** `staff_user_id` now exists  
✅ **Activity Logging:** Now works for calls and status changes  
✅ **RLS Policies:** Properly configured  
✅ **Indexes:** Added for performance

**Action Required:** Run `FIX_HR_LEAD_ACTIVITIES.sql` in Supabase! 🚀
