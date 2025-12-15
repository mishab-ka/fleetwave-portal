# 📊 HR Daily History & Performance Tracking - Complete Setup Guide

## 🎯 Overview

This guide will help you set up the new **Daily History** tracking system that:
- ✅ Fixes the "Calls Today" not showing issue
- ✅ Stores daily performance history for each HR staff member
- ✅ Tracks conversion rates, call duration, and work hours
- ✅ Automatically updates after each call
- ✅ Provides historical performance analytics

---

## 🔧 Setup Steps

### Step 1: Create the Daily Stats Table

Run the SQL script to create the `hr_staff_daily_stats` table and all supporting functions:

```bash
# Navigate to your project directory
cd /Users/mishabka/Tawaaq/fleetwave-portal

# Run the setup script in Supabase SQL Editor
# Copy and paste the contents of this file:
supabase/CREATE_HR_DAILY_STATS_TABLE.sql
```

**What this creates:**
- ✅ `hr_staff_daily_stats` table with columns for all daily metrics
- ✅ `aggregate_daily_stats()` function to calculate daily statistics
- ✅ Automatic triggers that update stats when calls are tracked
- ✅ Automatic triggers that update stats when attendance is recorded
- ✅ Proper indexes for fast queries
- ✅ RLS policies for security

---

### Step 2: Backfill Historical Data

After creating the table, backfill all existing call data:

```bash
# Run the backfill script in Supabase SQL Editor
# Copy and paste the contents of this file:
supabase/BACKFILL_DAILY_STATS.sql
```

**What this does:**
- ✅ Processes all existing calls from `hr_call_tracking` table
- ✅ Creates daily summary records for each staff member
- ✅ Calculates conversion rates, durations, and other metrics
- ✅ Links attendance data (clock in/out times and work hours)

---

### Step 3: Verify the Setup

Run this query in Supabase SQL Editor to verify everything is working:

```sql
-- Check daily stats
SELECT 
  ds.date,
  u.name as staff_name,
  ds.total_calls,
  ds.successful_calls,
  ds.conversion_rate,
  ds.total_work_hours
FROM hr_staff_daily_stats ds
JOIN users u ON u.id = ds.staff_user_id
ORDER BY ds.date DESC, u.name
LIMIT 20;
```

You should see:
- ✅ Daily records for each staff member who has made calls
- ✅ Accurate call counts and conversion rates
- ✅ Work hours (if attendance was tracked)

---

## 📱 Using the New Features

### For HR Managers & Admins

#### 1. **Daily History View**
Navigate to: **Dashboard → Daily History**

Features:
- 📅 View daily performance breakdown for all staff
- 🔍 Filter by date range (Last 7 Days, This Month, Last 3 Months)
- 👥 Filter by specific staff member
- 📊 See conversion rates, call durations, and work hours
- 📈 Track performance trends day-by-day

#### 2. **Team Performance (Fixed)**
Navigate to: **Dashboard → Team Performance**

Improvements:
- ✅ "Calls Today" now accurately counts today's calls
- ✅ Fixed date comparison logic (no more timezone issues)
- ✅ Real-time updates after each call
- ✅ Accurate weekly and monthly breakdowns

---

### For HR Staff

#### 1. **My Daily History**
Navigate to: **Dashboard → Daily History**

Features:
- 📅 View your own daily performance history
- 📊 Track your conversion rate over time
- ⏱️ Monitor your call duration trends
- 🎯 See daily goals and achievements

#### 2. **My Performance (Fixed)**
Navigate to: **Dashboard → Performance**

Improvements:
- ✅ "Calls Today" shows correct count
- ✅ Real-time updates
- ✅ Accurate daily statistics

---

## 🔄 How It Works

### Automatic Updates

The system automatically updates daily stats in these scenarios:

#### 1. **After Each Call**
```typescript
// When a call is saved in HRStaffLeads.tsx
await supabase.rpc("aggregate_daily_stats", {
  p_staff_user_id: user?.id,
  p_date: callData.calledDate,
});
```

#### 2. **Database Triggers**
```sql
-- Trigger fires after insert/update on hr_call_tracking
CREATE TRIGGER update_daily_stats_on_call
AFTER INSERT OR UPDATE ON hr_call_tracking
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_stats();

-- Trigger fires after attendance is recorded
CREATE TRIGGER update_daily_stats_on_attendance
AFTER INSERT OR UPDATE ON hr_staff_attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_stats_attendance();
```

---

## 📊 Daily Stats Table Schema

```sql
CREATE TABLE hr_staff_daily_stats (
  id UUID PRIMARY KEY,
  staff_user_id UUID,              -- FK to users table
  date DATE NOT NULL,               -- The date for this record
  
  -- Call Metrics
  total_calls INTEGER,              -- Total calls made
  successful_calls INTEGER,         -- Calls resulting in joined/hot_lead/callback
  failed_calls INTEGER,             -- Calls that failed
  total_call_duration INTEGER,      -- Total duration in seconds
  avg_call_duration DECIMAL(10,2),  -- Average duration per call
  
  -- Lead Metrics
  leads_contacted INTEGER,          -- Number of leads contacted
  hot_leads_generated INTEGER,      -- Hot leads from this day
  leads_joined INTEGER,             -- Leads that joined
  callbacks_scheduled INTEGER,      -- Callbacks scheduled
  
  -- Performance
  conversion_rate DECIMAL(5,2),     -- Success rate percentage
  
  -- Breakdowns (JSON)
  status_breakdown JSONB,           -- Count by status
  source_breakdown JSONB,           -- Count by source
  
  -- Attendance
  clock_in_time TIMESTAMP,          -- When staff clocked in
  clock_out_time TIMESTAMP,         -- When staff clocked out
  total_work_hours DECIMAL(10,2),   -- Total work hours
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(staff_user_id, date)       -- One record per staff per day
);
```

---

## 🐛 Troubleshooting

### Issue: "Calls Today" still showing 0

**Solution 1: Verify the trigger is working**
```sql
-- Check if triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%daily_stats%';
```

**Solution 2: Manually aggregate today's stats**
```sql
-- Replace 'staff-user-id-here' with actual staff user ID
SELECT aggregate_daily_stats(
  'staff-user-id-here'::uuid,
  CURRENT_DATE
);
```

**Solution 3: Check call tracking data**
```sql
-- Verify calls are being saved correctly
SELECT 
  staff_user_id,
  called_date,
  COUNT(*) as call_count
FROM hr_call_tracking
WHERE called_date = CURRENT_DATE
GROUP BY staff_user_id, called_date;
```

---

### Issue: Daily stats not updating automatically

**Check the RPC function:**
```sql
-- Test the function manually
SELECT aggregate_daily_stats(
  (SELECT id FROM users WHERE role = 'hr_staff' LIMIT 1),
  CURRENT_DATE
);

-- Check for errors
SELECT * FROM hr_staff_daily_stats
WHERE date = CURRENT_DATE;
```

---

### Issue: Missing historical data

**Re-run the backfill script:**
```bash
# Run in Supabase SQL Editor
# supabase/BACKFILL_DAILY_STATS.sql
```

---

## 📈 Performance Tips

### 1. **Regular Maintenance**
```sql
-- Run weekly to keep stats up-to-date
SELECT aggregate_daily_stats(staff_user_id, date)
FROM (
  SELECT DISTINCT staff_user_id, called_date as date
  FROM hr_call_tracking
  WHERE called_date >= CURRENT_DATE - INTERVAL '7 days'
) subquery;
```

### 2. **Index Optimization**
```sql
-- Already created in setup, but verify:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'hr_staff_daily_stats';
```

### 3. **Query Performance**
```sql
-- Use indexes for fast queries
EXPLAIN ANALYZE
SELECT * FROM hr_staff_daily_stats
WHERE staff_user_id = 'some-uuid'
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

---

## 🎉 What's Fixed

### ✅ Date Comparison Issues
**Before:**
```typescript
// This had timezone problems
if (callDate.toDateString() === today.toDateString()) {
  staffMetrics[staffId].calls_today++;
}
```

**After:**
```typescript
// Now uses string comparison (no timezone issues)
const todayString = now.toISOString().split("T")[0];
if (callDateString === todayString) {
  staffMetrics[staffId].calls_today++;
}
```

### ✅ Historical Tracking
- Now stores daily performance permanently
- Can view trends over time
- Supports analytics and reporting

### ✅ Real-time Updates
- Stats update immediately after each call
- Database triggers ensure consistency
- No manual refresh needed

---

## 🚀 Next Steps

1. ✅ Run `CREATE_HR_DAILY_STATS_TABLE.sql`
2. ✅ Run `BACKFILL_DAILY_STATS.sql`
3. ✅ Test by making a call and checking "Daily History"
4. ✅ Verify "Calls Today" shows correct count in "Team Performance"
5. ✅ Set up weekly maintenance job (optional)

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify all SQL scripts ran successfully
3. Check browser console for JavaScript errors
4. Check Supabase logs for database errors

---

## 📝 Summary

You now have:
- ✅ Fixed "Calls Today" counter
- ✅ Daily performance history for all staff
- ✅ Automatic stats aggregation
- ✅ Historical trend analysis
- ✅ Conversion rate tracking
- ✅ Work hours integration

The system will automatically maintain daily stats going forward! 🎉

