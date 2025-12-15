# Working Hours Tracking - Quick Setup

## ✅ What You Need to Know

Your mobile app **already tracks active work time** correctly! The system:
- ✅ Pauses when app goes to background
- ✅ Resumes when app returns to foreground
- ✅ Updates `active_work_seconds` in real-time
- ✅ Only counts actual working time

## 🚀 Setup Steps

### 1. Run Database Script (One Time)

```sql
-- Copy and paste into Supabase SQL Editor
-- File: supabase/CREATE_WORKING_HOURS_TRACKING.sql
```

**What it does:**
- Adds `active_work_seconds` column (if missing)
- Adds `active_work_hours` column to daily stats (if missing)
- Creates calculation functions
- Creates auto-update triggers

### 2. Verify Mobile App Integration

Your mobile app code already has:
- ✅ `updateActiveTime()` - Updates active_work_seconds
- ✅ `updateAppState()` - Handles background/foreground
- ✅ Clock in/out functionality

**Just make sure:**
- Mobile app calls `updateActiveTime()` every few seconds when active
- App state changes are logged via `updateAppState()`

### 3. Access Working Hours

1. Login to web portal
2. Click **"Working Hours"** tab in HR Dashboard
3. Select view: Daily / Weekly / Monthly
4. Filter by staff (optional)

## 📊 What You'll See

### Daily View
- **Day Navigator** - Previous/Next/Today buttons
- **Summary Cards** - Today's hours, sessions, 30-day average
- **History Table** - Last 30 days with clock in/out times

### Weekly View
- **Week Navigator** - Previous/Next week buttons
- **Summary Cards** - This week totals
- **History Table** - Last 12 weeks

### Monthly View
- **Summary Cards** - This month totals
- **History Table** - Last 12 months

## 🔍 Data Source

**Working Hours come from:**
- `hr_staff_attendance.active_work_seconds` (from mobile app)
- Aggregated into `hr_staff_daily_stats.active_work_hours`
- Calculated automatically via database triggers

## ⚠️ Important Notes

1. **Only Active Time Counts**
   - Time when app is closed/backgrounded is NOT counted
   - Only `active_work_seconds` is used
   - This is intentional and correct!

2. **Real-Time Updates**
   - Mobile app updates every few seconds
   - Daily stats update automatically
   - Web component shows latest data

3. **Multiple Sessions**
   - Staff can clock in/out multiple times per day
   - All sessions are summed for daily total

## 🐛 Troubleshooting

### No Data Showing?
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'hr_staff_attendance' 
AND column_name = 'active_work_seconds';

-- Manually calculate for today
SELECT calculate_daily_working_hours(
  'your-staff-id'::UUID,
  CURRENT_DATE
);
```

### Hours Not Updating?
```sql
-- Check trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'trg_update_daily_working_hours';

-- Check attendance records
SELECT 
  DATE(clock_in_time) as date,
  active_work_seconds / 3600.0 as hours
FROM hr_staff_attendance
WHERE staff_user_id = 'your-staff-id'
ORDER BY clock_in_time DESC
LIMIT 10;
```

## ✅ Testing

1. **Mobile App:**
   - Clock in
   - Use app for 5 minutes
   - Put app in background for 2 minutes
   - Return to app
   - Clock out
   - Should show ~5 minutes (not 7)

2. **Web Portal:**
   - Navigate to Working Hours tab
   - Select Daily view
   - Navigate to today
   - Verify hours match mobile app

## 📝 Files Created

- ✅ `supabase/CREATE_WORKING_HOURS_TRACKING.sql`
- ✅ `src/components/HRWorkingHours.tsx`
- ✅ `src/services/hrWorkingHoursService.ts`
- ✅ `src/components/HRDashboard.tsx` (modified)

## 🎯 Next Steps

1. Run the SQL script
2. Test with mobile app
3. Verify data in web portal
4. Train staff on using the system

---

**Setup Time:** ~5 minutes  
**Status:** ✅ Ready to Use  
**Mobile App:** ✅ Already Compatible

