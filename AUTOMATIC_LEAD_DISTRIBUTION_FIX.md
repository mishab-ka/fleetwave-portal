# HR System Fix: Automatic Lead Distribution 🎯

## What's Been Fixed

I've fixed TWO critical issues:

### 1. ✅ Database Table Structure

Fixed the `hr_staff_assignments` table to work correctly with your application.

### 2. ✅ Automatic Lead Distribution (NEW!)

**When an HR Manager adds a new lead, it now automatically assigns it equally among all HR Staff members!**

---

## The Problems

### Problem 1: Database Error

```
"Could not find a relationship between 'hr_staff_assignments' and 'users' in the schema cache"
```

- The table either doesn't exist or has wrong structure
- The code was trying to use a database join that doesn't work

### Problem 2: Lead Assignment

- You wanted leads to be automatically distributed equally among staff
- The feature was already coded but failing due to the database error

---

## The Solutions

### Fix 1: Run the SQL Script

**File:** `supabase/FIX_HR_STAFF_ASSIGNMENTS.sql`

**What to do:**

1. Open your Supabase Dashboard → SQL Editor
2. Copy ALL contents from `supabase/FIX_HR_STAFF_ASSIGNMENTS.sql`
3. Paste and click "Run"

**What this does:**

- Creates the correct `hr_staff_assignments` table structure
- Sets up proper relationships to `auth.users`
- Creates indexes for performance
- Configures Row Level Security (RLS) policies
- Adds automatic timestamp updates

### Fix 2: Updated Lead Assignment Code

**File:** `src/components/HRLeadsManagement.tsx`

**What changed:**

- Removed the problematic database join
- Fixed the staff assignment query to work correctly
- Added better error handling
- Improved lead distribution algorithm

---

## How Automatic Lead Distribution Works

### Smart Distribution Algorithm 🧠

When an HR Manager adds a new lead:

1. **Fetch Active Staff**: Gets all active HR Staff assigned to this manager
2. **Count Current Leads**: Counts active leads for each staff member
3. **Find Least Loaded**: Finds the staff member with the fewest active leads
4. **Auto-Assign**: Automatically assigns the new lead to that staff member

### Example:

**Your HR Staff:**

- Sarah: 5 active leads
- John: 3 active leads
- Mike: 7 active leads

**You add a new lead → Automatically assigned to John** (least leads)

---

## Features Included

### ✨ Equal Distribution

- Leads are distributed evenly across all staff
- System tracks active leads per staff member
- Always assigns to the staff with least workload

### 📊 Only Counts Active Leads

The system only counts leads with these statuses:

- `new`
- `contacted`
- `hot_lead`
- `cold_lead`
- `callback`

Completed leads (joined, not interested, etc.) don't count towards workload!

### 🎯 Intelligent Fallback

- If staff have equal leads → assigns to first staff
- If no staff assigned → lead stays unassigned (with alert)

---

## Step-by-Step Setup

### Step 1: Fix the Database

1. Open Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Copy contents of: `supabase/FIX_HR_STAFF_ASSIGNMENTS.sql`
4. Paste and click **"Run"**
5. Wait for success message

### Step 2: Verify Table Structure

Run this query to verify:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'hr_staff_assignments'
ORDER BY ordinal_position;
```

You should see:

- `id` (uuid)
- `hr_manager_user_id` (uuid)
- `hr_staff_user_id` (uuid)
- `assigned_at` (timestamp)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Step 3: Test the System

1. **Login as HR Manager**
2. **Assign Some Staff Members**

   - Go to "HR Staff Management"
   - Click "Assign Staff"
   - Add 2-3 HR Staff members

3. **Add a Lead**

   - Go to "Leads Management"
   - Click "Add Lead"
   - Enter phone number
   - Click "Save"

4. **Check Distribution**
   - The lead should automatically be assigned to one of your staff
   - Add more leads and watch them distribute equally

---

## Cards Display (Mobile Optimized) 📱

Both components now display as **small cards instead of tables**:

### HR Staff Management

- Shows assigned staff as compact cards
- Mobile: 2 columns
- Tablet: 3 columns
- Desktop: 4 columns

### Leads Display

- Shows leads as compact cards
- Mobile: 1 column (no scrolling!)
- Tablet: 2 columns
- Desktop: 3-4 columns

**Benefits:**

- ✅ No horizontal scrolling on mobile
- ✅ Touch-friendly interface
- ✅ Better visual hierarchy
- ✅ Faster interaction

---

## Troubleshooting

### Error: "Could not find relationship"

**Solution:** You haven't run the SQL script yet. Go to Step 1 above.

### Error: "Failed to add lead"

**Possible causes:**

1. No staff members assigned to you
2. Database permissions issue
3. `hr_leads` table doesn't exist

**Fix:**

- Make sure you have assigned at least one HR Staff member
- Check that you have the `hr_manager` or `admin` role

### Leads not distributing equally

**Check:**

1. Are multiple staff members assigned to you?
2. Run this query to see current distribution:

```sql
SELECT
  assigned_staff_user_id,
  COUNT(*) as lead_count
FROM hr_leads
WHERE status IN ('new', 'contacted', 'hot_lead', 'cold_lead', 'callback')
GROUP BY assigned_staff_user_id;
```

---

## Database Table Structure

### hr_staff_assignments

```
┌─────────────────────────┬──────────┬─────────────────────┐
│ Column                  │ Type     │ References          │
├─────────────────────────┼──────────┼─────────────────────┤
│ id                      │ UUID     │ PRIMARY KEY         │
│ hr_manager_user_id      │ UUID     │ → auth.users(id)    │
│ hr_staff_user_id        │ UUID     │ → auth.users(id)    │
│ assigned_at             │ TIMESTAMP│                     │
│ is_active               │ BOOLEAN  │ default: true       │
│ created_at              │ TIMESTAMP│                     │
│ updated_at              │ TIMESTAMP│ auto-updated        │
└─────────────────────────┴──────────┴─────────────────────┘

Constraint: UNIQUE(hr_staff_user_id)
- Each staff member can only be assigned to one manager
```

---

## Testing Checklist

- [ ] SQL script executed successfully
- [ ] Table `hr_staff_assignments` exists
- [ ] HR Staff Management page loads without errors
- [ ] Can assign staff members
- [ ] Staff members display as cards
- [ ] Can add a new lead
- [ ] Lead is automatically assigned to a staff member
- [ ] Leads display as cards
- [ ] Multiple leads distribute equally
- [ ] Cards display correctly on mobile

---

## Summary

### What You Get:

1. **✅ Fixed Database** - Correct table structure
2. **✅ Auto Distribution** - Leads assigned equally to staff
3. **✅ Card Layout** - Mobile-friendly display
4. **✅ Smart Algorithm** - Always assigns to least loaded staff
5. **✅ Error Handling** - Clear messages if something goes wrong

### Next Steps:

1. Run the SQL script
2. Assign your HR Staff members
3. Start adding leads and watch them auto-distribute! 🎉

---

## Need Help?

If you still encounter issues:

1. Check browser console for errors (F12)
2. Verify your user has `hr_manager` or `admin` role
3. Ensure staff members have `hr_staff` role
4. Check Supabase logs for database errors
