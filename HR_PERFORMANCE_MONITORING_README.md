# HR Performance Monitoring System - Implementation Guide

## Overview

This document provides a comprehensive guide to the HR Performance Monitoring System implemented for remote HR staff tracking and performance management.

## ✅ Completed Components

### 1. Database Schema (✅ Complete)
**Files:**
- `supabase/HR_PERFORMANCE_MONITORING_SCHEMA.sql`
- `supabase/ENHANCE_HR_CALL_TRACKING.sql`

**Tables Created:**
- `hr_staff_attendance` - Clock-in/out tracking with work hours
- `hr_staff_targets` - Daily/weekly/monthly performance targets
- `hr_staff_daily_metrics` - Cached daily performance metrics
- `hr_performance_alerts` - Automated performance alerts
- `hr_staff_activity_log` - Detailed activity logging
- Enhanced `hr_call_tracking` with quality metrics

### 2. Backend Services (✅ Complete)

#### Activity Tracker Service
**File:** `src/services/hrActivityTracker.ts`

**Functions:**
- `logActivity()` - Log staff activities
- `updateLastActivity()` - Update last activity timestamp
- `checkIdleStatus()` - Detect idle staff members
- `getRecentActivities()` - Fetch recent activity history
- `getHourlyActivitySummary()` - Get hourly breakdown
- `getActiveStaffList()` - Get currently active staff

#### Attendance Service
**File:** `src/services/hrAttendanceService.ts`

**Functions:**
- `clockIn()` - Start work session
- `clockOut()` - End work session with hours calculation
- `getAttendanceStatus()` - Check current clock-in status
- `getActiveStaff()` - Get all clocked-in staff
- `autoClockOut()` - Automatic clock-out after max hours/idle time
- `calculateWorkHours()` - Calculate hours for date range
- `markMissedAttendance()` - Mark no-shows

#### Targets & Alerts Service
**File:** `src/services/hrTargetsService.ts`

**Functions:**
- `getActiveTargets()` - Get staff targets
- `setTarget()` - Create/update targets
- `checkDailyTargets()` - Check targets and generate alerts
- `checkWeeklyTargets()` - Weekly target evaluation
- `createAlert()` - Create performance alert
- `getAlerts()` - Fetch alerts for staff/managers
- `markAlertAsRead()` - Mark alert as read
- `resolveAlert()` - Resolve alert
- `getTargetAchievement()` - Calculate achievement percentage

**Alert Types:**
- `no_clock_in` - Staff didn't clock in (after 10 AM)
- `no_calls` - No calls made (after 12 PM)
- `target_50_percent` - Below 50% target at 2 PM
- `target_missed` - Missed daily target (at 6 PM)
- `low_conversion` - Conversion rate below 30%
- `excellent_performance` - Exceeded target by 20%+

#### Metrics Service
**File:** `src/services/hrMetricsService.ts`

**Functions:**
- `calculateDailyMetrics()` - Calculate and cache daily metrics
- `calculateResponseTime()` - Time from lead assignment to call
- `calculateQualityScore()` - Quality score (0-100)
- `updateAllStaffMetrics()` - Batch update all staff
- `getDailyMetrics()` - Get metrics for a date
- `getMetricsRange()` - Get metrics for date range
- `getAggregatedMetrics()` - Aggregate metrics for period
- `getTeamMetrics()` - Team-wide metrics for managers

**Quality Score Factors:**
- Conversion rate (40% weight)
- Call volume (30% weight)
- Average call duration (15% weight)
- Response time (15% weight)

### 3. Frontend Components (✅ Complete)

#### Clock-In Widget
**File:** `src/components/HRClockInWidget.tsx`

**Features:**
- Clock-in/out buttons
- Hours worked display
- Clock-in time display
- Idle detection warning
- Compact mode for headers
- Auto-refresh every minute

#### Activity Timeline
**File:** `src/components/HRActivityTimeline.tsx`

**Features:**
- 24-hour activity visualization
- Hourly activity breakdown
- Color-coded intensity (high/medium/low/none)
- Hover tooltips with details
- Summary stats (total, active hours, peak)
- Work hours highlighting

#### Alert Center
**File:** `src/components/HRAlertCenter.tsx`

**Features:**
- Alert list with filtering
- Severity filtering (critical/warning/info)
- Unread/all toggle
- Mark as read functionality
- Resolve alerts (managers only)
- Compact mode for dashboards
- Staff view (own alerts) and Manager view (all alerts)

#### Live Activity Dashboard
**File:** `src/components/HRLiveActivityDashboard.tsx`

**Features:**
- Real-time staff status grid
- Status indicators (Active/Idle/Offline/Not Clocked In)
- Auto-refresh every 30 seconds
- Manual refresh button
- Hours worked per staff
- Calls today vs target
- Target progress bars
- Last activity timestamps
- Idle time warnings
- Team summary stats

## 🚧 Remaining Implementation Tasks

### High Priority

1. **Target Management Component** - UI for managers to set targets
2. **Integrate Activity Tracking** - Add logging to existing components
3. **Clock-In Requirement** - Prompt staff to clock in on dashboard load
4. **Update HRStaffOverview** - Add attendance, targets, timeline sections
5. **Update HRPerformanceAnalytics** - Add team targets, rankings, alerts

### Medium Priority

6. **Automated Alert System** - Scheduled job to check targets
7. **Daily Metrics Calculation** - End-of-day metrics calculation job
8. **Real-time Subscriptions** - Supabase realtime for live updates
9. **Mobile Optimization** - Update HRMobileView with clock-in/targets

### Lower Priority

10. **System Settings** - Admin panel for configuration
11. **Performance Reports** - Comprehensive reporting component

## 📊 How It Works

### Daily Workflow

**Morning (9-10 AM):**
1. Staff opens dashboard
2. Prompted to clock in (if not already)
3. Clock-in creates attendance record
4. System checks for no-shows at 10 AM → generates alerts

**During Work Hours:**
1. All staff actions logged automatically
2. Last activity time updated continuously
3. Idle detection (>30 min no activity)
4. Metrics calculated in real-time

**Midday (12 PM - 2 PM):**
1. 12 PM: Alert if no calls made
2. 2 PM: Alert if below 50% of target

**End of Day (6 PM):**
1. Final target check
2. Alerts for missed targets
3. Alerts for excellent performance (120%+ target)
4. Low conversion rate alerts (if <30%)
5. Daily metrics cached to database

**Auto Clock-Out:**
- After 12 hours of work
- After 2 hours of inactivity

### Manager Dashboard

**Live Monitoring:**
- See all staff in real-time
- Active/Idle/Offline status
- Current call counts
- Target progress

**Alert Center:**
- All staff alerts in one place
- Filter by severity
- Mark as read/resolved
- Quick actions

**Performance Analytics:**
- Team-wide metrics
- Staff rankings
- Trend analysis
- Export reports

### Staff Dashboard

**Clock-In Widget:**
- Prominent clock-in/out button
- Hours worked today
- Idle warnings

**Performance View:**
- Today's calls vs target
- Target progress bar
- Activity timeline
- Personal alerts

**Activity Tracking:**
- Automatic (transparent)
- Logs: calls, lead views, status updates, page views
- Updates last activity time

## 🔧 Setup Instructions

### 1. Run Database Migrations

```bash
# Run in Supabase SQL Editor
# Execute HR_PERFORMANCE_MONITORING_SCHEMA.sql
# Execute ENHANCE_HR_CALL_TRACKING.sql
```

### 2. Set Default Targets (Optional)

```sql
-- Create global daily target (applies to all staff)
INSERT INTO hr_staff_targets (
  staff_user_id,
  target_type,
  target_calls,
  target_conversions,
  target_work_hours,
  start_date,
  is_active,
  is_global
) VALUES (
  NULL,
  'daily',
  30,  -- 30 calls per day
  10,  -- 10 conversions per day
  8.0, -- 8 hours work
  CURRENT_DATE,
  true,
  true
);
```

### 3. Import Services in Components

```typescript
// In any component
import { clockIn, clockOut } from "@/services/hrAttendanceService";
import { logActivity } from "@/services/hrActivityTracker";
import { getActiveTargets } from "@/services/hrTargetsService";
```

### 4. Add Clock-In Widget to Dashboard

```typescript
import HRClockInWidget from "@/components/HRClockInWidget";

// In dashboard
<HRClockInWidget compact={false} onStatusChange={(isClockedIn) => {
  console.log("Clock-in status:", isClockedIn);
}} />
```

### 5. Add Live Dashboard for Managers

```typescript
import HRLiveActivityDashboard from "@/components/HRLiveActivityDashboard";

// In manager dashboard
<HRLiveActivityDashboard />
```

## 🎯 Key Features

### For HR Staff

✅ **Clock-In/Out System**
- Easy one-click clock-in/out
- Automatic hours calculation
- Idle detection warnings

✅ **Target Tracking**
- See daily/weekly targets
- Real-time progress
- Achievement notifications

✅ **Activity Monitoring**
- Transparent automatic tracking
- Activity timeline visualization
- Personal performance metrics

✅ **Alert Notifications**
- Target reminders
- Performance feedback
- Achievement recognition

### For HR Managers

✅ **Live Dashboard**
- Real-time staff monitoring
- Active/idle/offline status
- Team performance overview

✅ **Target Management**
- Set global or individual targets
- Daily/weekly/monthly options
- Automatic achievement tracking

✅ **Alert System**
- Automated performance alerts
- Severity levels (critical/warning/info)
- Alert resolution tracking

✅ **Performance Analytics**
- Team metrics and rankings
- Trend analysis
- Quality scores
- Response time tracking

✅ **Attendance Monitoring**
- Clock-in/out times
- Hours worked tracking
- Missed attendance detection
- Auto clock-out for extended sessions

## 📈 Metrics Tracked

### Call Metrics
- Total calls
- Successful calls (joined, hot_lead, callback)
- Failed calls (not_interested, call_not_picked)
- Call duration (total, average)
- Calls by status
- Calls by source

### Lead Metrics
- Leads contacted
- Hot leads generated
- Joined count
- Callbacks scheduled

### Performance Metrics
- Conversion rate
- Response time (hours)
- Quality score (0-100)
- Target achievement percentage

### Activity Metrics
- First activity time
- Last activity time
- Active hours
- Hourly breakdown
- Idle periods

## 🔔 Alert Triggers

### Critical Alerts
- No clock-in by 10 AM
- Extended idle time (>1 hour)

### Warning Alerts
- No calls by 12 PM
- Below 50% target at 2 PM
- Missed daily target
- Low conversion rate (<30%)

### Info Alerts
- Target achieved
- Excellent performance (>120% target)

## 🚀 Next Steps

1. **Complete remaining components** (Target Management, etc.)
2. **Integrate activity tracking** into existing components
3. **Set up automated jobs** for alerts and metrics
4. **Configure real-time subscriptions** for live updates
5. **Test with real users** and gather feedback
6. **Optimize performance** and add caching where needed

## 💡 Best Practices

### For Managers
- Set realistic targets based on historical data
- Review alerts daily
- Provide feedback on excellent performance
- Address low performance early

### For Staff
- Clock in at start of day
- Stay active during work hours
- Review personal alerts
- Track progress toward targets

### System Maintenance
- Run daily metrics calculation at end of day
- Auto clock-out inactive sessions
- Archive old alerts (>30 days)
- Monitor database performance

## 📝 Notes

- All times are in the user's local timezone
- Metrics are cached daily for performance
- Real-time updates use 30-second polling (can be upgraded to Supabase Realtime)
- Quality scores are calculated using weighted algorithm
- Idle threshold is configurable (default: 30 minutes)
- Auto clock-out after 12 hours or 2 hours idle

## 🐛 Troubleshooting

**Staff can't clock in:**
- Check RLS policies on hr_staff_attendance
- Verify user has hr_staff role

**Alerts not generating:**
- Run checkDailyTargets() manually
- Verify targets are set and active
- Check alert generation logs

**Metrics not updating:**
- Run calculateDailyMetrics() for specific date
- Check hr_call_tracking data exists
- Verify RLS policies

**Live dashboard not showing staff:**
- Verify staff are clocked in
- Check getActiveStaff() function
- Ensure attendance records exist

## 📞 Support

For issues or questions about the HR Performance Monitoring System, please refer to:
- Database schema: `HR_PERFORMANCE_MONITORING_SCHEMA.sql`
- Service documentation: Comments in service files
- Component props: TypeScript interfaces in component files

