# Working Hours Tracking System

## Overview
Complete system to track daily, weekly, and monthly working hours based on clock in/out times and **active work time** (excluding background time when mobile app is closed).

---

## Key Features

### ✅ Active Work Time Tracking
- **Only counts time when app is in foreground**
- **Pauses automatically** when app goes to background
- **Resumes** when app comes back to foreground
- **No manipulation** - only actual working time is counted

### ✅ Three View Modes
1. **Daily View** - Day-by-day breakdown with navigation
2. **Weekly View** - Week-by-week summary (last 12 weeks)
3. **Monthly View** - Month-by-month summary (last 12 months)

### ✅ Day Navigator
- Navigate between days with Previous/Next buttons
- Jump to "Today" quickly
- See current day highlighted in table

### ✅ Staff Filtering
- View individual staff member hours
- View all staff aggregated hours
- Filter by staff member

---

## Database Setup

### 1. Run SQL Script
Execute the SQL script to set up the tracking system:

```sql
-- File: supabase/CREATE_WORKING_HOURS_TRACKING.sql
```

**This script:**
- ✅ Adds `active_work_seconds` column to `hr_staff_attendance` (if missing)
- ✅ Adds `active_work_hours` column to `hr_staff_daily_stats` (if missing)
- ✅ Creates functions to calculate working hours
- ✅ Creates triggers to auto-update daily stats
- ✅ Creates indexes for performance

### 2. Verify Columns Exist
```sql
-- Check attendance table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hr_staff_attendance' 
AND column_name IN ('active_work_seconds', 'total_work_duration_seconds');

-- Check daily stats table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hr_staff_daily_stats' 
AND column_name = 'active_work_hours';
```

---

## How It Works

### Mobile App Flow

1. **Staff Clocks In**
   ```typescript
   await staffAPI.clockIn(userId);
   // Creates attendance record with clock_in_time
   ```

2. **App Tracks Active Time**
   ```typescript
   // When app is ACTIVE (foreground)
   await staffAPI.updateActiveTime(userId, attendanceId, activeSeconds);
   // Updates active_work_seconds in real-time
   ```

3. **App Goes to Background**
   ```typescript
   // AppState listener detects background
   await staffAPI.updateAppState(userId, "background");
   // Logs activity, timer pauses
   ```

4. **App Returns to Foreground**
   ```typescript
   // AppState listener detects active
   await staffAPI.updateAppState(userId, "active");
   // Logs activity, timer resumes
   ```

5. **Staff Clocks Out**
   ```typescript
   await staffAPI.clockOut(userId);
   // Calculates final duration
   // Updates active_work_seconds
   // Triggers daily stats update
   ```

### Database Functions

#### `calculate_daily_working_hours(p_staff_user_id, p_date)`
- Sums all `active_work_seconds` from attendance records for the date
- Converts to hours (rounded to 2 decimals)
- Updates `hr_staff_daily_stats.active_work_hours`

#### `get_working_hours_range(p_staff_user_id, p_start_date, p_end_date)`
- Returns working hours for date range
- Includes clock in/out times
- Shows total sessions per day

#### `get_weekly_working_hours(p_staff_user_id, p_week_start)`
- Calculates total hours for a week
- Returns single decimal value

#### `get_monthly_working_hours(p_staff_user_id, p_year, p_month)`
- Calculates total hours for a month
- Returns single decimal value

---

## Component Structure

### HRWorkingHours Component
**Location:** `src/components/HRWorkingHours.tsx`

**Features:**
- Three view modes (Daily/Weekly/Monthly)
- Day navigation for daily view
- Staff filtering
- Beautiful gradient cards
- Scrollable tables
- Real-time data

### Service Layer
**Location:** `src/services/hrWorkingHoursService.ts`

**Functions:**
- `getWorkingHoursRange()` - Get date range data
- `getWeeklyWorkingHours()` - Get weekly summaries
- `getMonthlyWorkingHours()` - Get monthly summaries
- `updateDailyWorkingHours()` - Manually update hours
- `formatHours()` - Format hours to readable string

---

## Daily View

### Features
- **Day Navigator** - Previous/Next buttons
- **Current Day Summary** - Today's hours, sessions, 30-day average
- **Daily History Table** - Last 30 days with:
  - Date and day of week
  - Active hours (color-coded badges)
  - Clock in/out times
  - Number of sessions
  - Current day highlighted

### Navigation
```tsx
// Navigate to previous day
navigateDay("prev");

// Navigate to next day
navigateDay("next");

// Jump to today
setCurrentDate(new Date());
```

### Data Display
- **Today's Hours** - Current day active work time
- **Sessions** - Number of clock in sessions
- **Average (30 days)** - Average hours per day over last 30 days

---

## Weekly View

### Features
- **Week Navigator** - Previous/Next week buttons
- **This Week Summary** - Total hours, days worked, average per day
- **Weekly History Table** - Last 12 weeks with:
  - Week range (Mon-Sun)
  - Total hours
  - Days worked
  - Average hours per day
  - Status badge (Complete/Partial/Low)

### Week Calculation
- Week starts on Monday
- Week ends on Sunday
- Shows last 12 weeks

### Status Badges
- **Complete** (Green) - 40+ hours/week
- **Partial** (Yellow) - 20-39 hours/week
- **Low** (Gray) - <20 hours/week

---

## Monthly View

### Features
- **This Month Summary** - Total hours, days worked, average per day
- **Monthly History Table** - Last 12 months with:
  - Month and year
  - Total hours
  - Days worked
  - Average hours per day
  - Status badge (Complete/Partial/Low)

### Status Badges
- **Complete** (Green) - 160+ hours/month (full-time)
- **Partial** (Yellow) - 80-159 hours/month
- **Low** (Gray) - <80 hours/month

---

## Data Flow

```
Mobile App
    │
    ├─ Clock In → hr_staff_attendance (clock_in_time)
    │
    ├─ App Active → Update active_work_seconds (real-time)
    │
    ├─ App Background → Pause timer (no update)
    │
    ├─ App Resume → Resume timer (continue updating)
    │
    └─ Clock Out → Calculate final active_work_seconds
                    ↓
        Trigger: update_daily_working_hours_on_attendance()
                    ↓
        Function: calculate_daily_working_hours()
                    ↓
        Update: hr_staff_daily_stats.active_work_hours
                    ↓
        Display: HRWorkingHours Component
```

---

## API Integration

### Mobile App APIs (Already Implemented)

#### Clock In
```typescript
await staffAPI.clockIn(userId);
// Creates attendance record
// Sets clock_in_time
// Sets is_active = true
```

#### Update Active Time
```typescript
await staffAPI.updateActiveTime(userId, attendanceId, activeSeconds);
// Updates active_work_seconds in real-time
// Called every few seconds when app is active
```

#### App State Change
```typescript
await staffAPI.updateAppState(userId, "background");
// Logs app_backgrounded activity
// Timer pauses

await staffAPI.updateAppState(userId, "active");
// Logs app_resumed activity
// Timer resumes
```

#### Clock Out
```typescript
await staffAPI.clockOut(userId);
// Calculates final duration
// Updates clock_out_time
// Sets is_active = false
// Triggers daily stats update
```

---

## Web Component Usage

### Access
1. Login as HR Manager, Admin, or HR Staff
2. Navigate to **"Working Hours"** tab in HR Dashboard
3. Select view mode (Daily/Weekly/Monthly)
4. Filter by staff member (optional)

### Daily View Usage
1. Select **"Daily"** from view dropdown
2. Use **Previous/Next** buttons to navigate days
3. Click **"Today"** to jump to current day
4. View summary cards at top
5. Scroll through daily history table

### Weekly View Usage
1. Select **"Weekly"** from view dropdown
2. Use **Previous Week/Next Week** buttons
3. Click **"This Week"** to jump to current week
4. View weekly summary cards
5. Scroll through weekly history table

### Monthly View Usage
1. Select **"Monthly"** from view dropdown
2. View monthly summary cards
3. Scroll through monthly history table (last 12 months)

---

## Data Accuracy

### Active Work Seconds
- **Source:** `hr_staff_attendance.active_work_seconds`
- **Updated:** Real-time when app is active
- **Paused:** When app goes to background
- **Resumed:** When app returns to foreground

### Daily Work Hours
- **Source:** `hr_staff_daily_stats.active_work_hours`
- **Calculated:** Sum of `active_work_seconds / 3600` for the day
- **Updated:** Automatically via trigger when attendance changes
- **Format:** Decimal (e.g., 8.5 hours)

### Weekly/Monthly Hours
- **Source:** Sum of daily `active_work_hours`
- **Calculated:** On-demand when viewing
- **Cached:** In daily stats table for performance

---

## Important Notes

### ⚠️ Background Time Exclusion
- **Time when app is closed/backgrounded is NOT counted**
- Only `active_work_seconds` is used (not `total_work_duration_seconds`)
- This ensures accurate working hours

### ⚠️ Multiple Sessions
- Staff can clock in/out multiple times per day
- All sessions are summed for daily total
- Each session tracked separately

### ⚠️ Real-Time Updates
- Mobile app updates `active_work_seconds` every few seconds
- Daily stats updated via database trigger
- Web component fetches latest data on load

### ⚠️ Timezone Handling
- All times stored in UTC
- Displayed in user's local timezone
- Date comparisons use DATE() function to avoid timezone issues

---

## Troubleshooting

### No Working Hours Showing

**Check:**
1. Is `active_work_seconds` column present in `hr_staff_attendance`?
2. Are staff clocking in/out properly?
3. Is mobile app updating `active_work_seconds`?
4. Are triggers enabled?

**Fix:**
```sql
-- Run the setup script
\i supabase/CREATE_WORKING_HOURS_TRACKING.sql

-- Manually calculate for a date
SELECT calculate_daily_working_hours(
  'staff-user-id-here'::UUID,
  '2025-11-28'::DATE
);
```

### Hours Not Updating

**Check:**
1. Is trigger enabled?
2. Are attendance records being updated?
3. Is daily stats table being updated?

**Fix:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trg_update_daily_working_hours';

-- Manually trigger update
UPDATE hr_staff_attendance 
SET active_work_seconds = active_work_seconds 
WHERE id = 'attendance-id-here';
```

### Wrong Hours Displayed

**Check:**
1. Is mobile app using `active_work_seconds` (not `total_work_duration_seconds`)?
2. Are background periods excluded?
3. Is data aggregated correctly?

**Verify:**
```sql
-- Check attendance records
SELECT 
  DATE(clock_in_time) as date,
  active_work_seconds,
  total_work_duration_seconds,
  active_work_seconds / 3600.0 as active_hours
FROM hr_staff_attendance
WHERE staff_user_id = 'staff-id-here'
ORDER BY clock_in_time DESC;

-- Check daily stats
SELECT 
  date,
  active_work_hours,
  total_work_hours
FROM hr_staff_daily_stats
WHERE staff_user_id = 'staff-id-here'
ORDER BY date DESC;
```

---

## Mobile App Requirements

### Required Fields
- `hr_staff_attendance.active_work_seconds` - Must be updated in real-time
- `hr_staff_attendance.clock_in_time` - Set on clock in
- `hr_staff_attendance.clock_out_time` - Set on clock out
- `hr_staff_attendance.is_active` - Boolean flag

### Required API Calls
1. `staffAPI.clockIn()` - On clock in
2. `staffAPI.updateActiveTime()` - Every few seconds when active
3. `staffAPI.updateAppState()` - On app state changes
4. `staffAPI.clockOut()` - On clock out

### App State Monitoring
```typescript
// Must monitor AppState
AppState.addEventListener("change", async (nextAppState) => {
  if (appState.current.match(/active/) && nextAppState === "background") {
    // Pause timer
    await staffAPI.updateAppState(userId, "background");
  } else if (appState.current.match(/inactive|background/) && nextAppState === "active") {
    // Resume timer
    await staffAPI.updateAppState(userId, "active");
  }
});
```

---

## Performance Considerations

### Indexes
- `idx_hr_attendance_active_work` - Fast queries by staff and date
- `idx_hr_staff_daily_stats_staff_date` - Fast daily stats lookup

### Caching
- Daily stats pre-calculated and stored
- Weekly/Monthly calculated on-demand
- Data refreshed on component mount

### Optimization
- Limit date ranges (30 days for daily, 12 weeks/months for others)
- Use aggregated daily stats instead of raw attendance
- Indexed queries for fast lookups

---

## Testing Checklist

✅ Database columns exist  
✅ Functions created successfully  
✅ Triggers enabled  
✅ Mobile app updates active_work_seconds  
✅ App state changes logged  
✅ Daily stats updated automatically  
✅ Daily view shows correct hours  
✅ Day navigation works  
✅ Weekly view shows correct totals  
✅ Monthly view shows correct totals  
✅ Staff filtering works  
✅ All staff aggregation works  
✅ Hours format correctly (h m)  
✅ Current day/week highlighted  
✅ Tables scroll properly  
✅ No console errors  

---

## Files Created/Modified

### New Files
1. ✅ `supabase/CREATE_WORKING_HOURS_TRACKING.sql` - Database setup
2. ✅ `src/components/HRWorkingHours.tsx` - Main component
3. ✅ `src/services/hrWorkingHoursService.ts` - Service layer

### Modified Files
1. ✅ `src/components/HRDashboard.tsx` - Added Working Hours tab

---

## Setup Instructions

### Step 1: Run Database Script
```sql
-- In Supabase SQL Editor
-- Run: supabase/CREATE_WORKING_HOURS_TRACKING.sql
```

### Step 2: Verify Setup
```sql
-- Check columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'hr_staff_attendance' 
AND column_name = 'active_work_seconds';

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%working_hours%';
```

### Step 3: Test Mobile App
1. Clock in from mobile app
2. Verify `active_work_seconds` updates
3. Put app in background
4. Verify timer pauses
5. Return app to foreground
6. Verify timer resumes
7. Clock out
8. Verify daily stats updated

### Step 4: Test Web Component
1. Login to web portal
2. Navigate to "Working Hours" tab
3. Verify data displays correctly
4. Test day navigation
5. Test weekly/monthly views
6. Test staff filtering

---

## Summary

### What This System Does
✅ Tracks **active work time only** (excludes background)  
✅ Calculates **daily, weekly, monthly** working hours  
✅ Provides **day navigation** for daily view  
✅ Shows **beautiful summaries** with cards and tables  
✅ Filters by **individual staff or all staff**  
✅ Updates **automatically** via database triggers  
✅ Displays **real-time** data from mobile app  

### Key Benefits
- 🎯 **Accurate** - Only counts actual working time
- 🚫 **No Manipulation** - Background time excluded
- 📊 **Comprehensive** - Daily, weekly, monthly views
- 🎨 **Beautiful UI** - Modern, easy to understand
- ⚡ **Fast** - Pre-calculated daily stats
- 📱 **Mobile-First** - Works with mobile app tracking

---

**Created:** November 28, 2025  
**Status:** ✅ Ready for Production  
**Integration:** ✅ Complete  
**Mobile App:** ✅ Compatible

