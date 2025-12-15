# 🚀 Manipulation Monitoring System - Quick Setup Guide

## ✅ Complete! Everything is Ready

I've implemented a **complete manipulation monitoring system** for your web application to detect and prevent HR staff manipulation.

---

## 📦 What Was Created

### 1. **React Component** ✅

**File:** `src/components/HRManipulationMonitor.tsx`

A complete monitoring dashboard that:

- Detects idle staff (low active time %)
- Finds staff with no calls made
- Catches timer manipulation (overnight timers, excessive background time)
- Shows real-time alerts
- Displays active staff with metrics
- Auto-refreshes every 30 seconds

### 2. **Integrated into HRDashboard** ✅

**File:** `src/components/HRDashboard.tsx`

New tab added:

- **"Manipulation Monitor"** tab (with Shield icon)
- Available for HR Managers and Admins only
- Fully integrated with existing navigation

### 3. **Complete Documentation** ✅

**File:** `WEB_MANIPULATION_MONITORING_GUIDE.md`

- All detection algorithms
- API references
- Usage examples
- Customization guide

---

## 🗄️ Database Setup Required

### Option 1: Quick Setup (No New Tables)

The component works **immediately** with your existing tables:

- `hr_staff_attendance`
- `hr_call_tracking`
- `users`

**Just run the app and access the new "Manipulation Monitor" tab!**

### Option 2: Advanced Setup (Optional - For Alert History)

If you want to **save alerts** to database for historical tracking:

```sql
-- Create alerts table
CREATE TABLE IF NOT EXISTS hr_manipulation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  staff_user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  details JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_manipulation_alerts_staff ON hr_manipulation_alerts(staff_user_id);
CREATE INDEX idx_manipulation_alerts_date ON hr_manipulation_alerts(created_at);
CREATE INDEX idx_manipulation_alerts_type ON hr_manipulation_alerts(alert_type);
CREATE INDEX idx_manipulation_alerts_severity ON hr_manipulation_alerts(severity);

-- RLS
ALTER TABLE hr_manipulation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view all alerts"
ON hr_manipulation_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('hr_manager', 'admin')
  )
);
```

---

## 🚀 How to Use

### 1. Login as HR Manager or Admin

```
Email: your-manager@company.com
Password: your-password
```

### 2. Navigate to Manipulation Monitor

Click on **"Manipulation Monitor"** in the left sidebar (Shield icon)

### 3. View Real-Time Monitoring

The dashboard shows:

- **Critical Alerts** - Urgent issues requiring immediate attention
- **Total Alerts** - All detected manipulation attempts
- **Active Staff** - Currently working staff count
- **Alert Details** - Specific manipulation types with details
- **Staff Cards** - Real-time active vs background time tracking

### 4. Take Action on Alerts

Each alert has a "Take Action" button. You can:

- Contact the staff member
- Review their activity log
- Mark alert as resolved
- Generate a report

---

## 🚨 What Gets Detected

### 1. **Low Active Time** (HIGH Severity)

- **Trigger:** Active time < 40% after 1+ hours of work
- **Example:** Staff has been clocked in for 3 hours but only 1 hour active (33%)
- **Action:** Check if staff is actually working

### 2. **Extended Idle** (HIGH Severity)

- **Trigger:** No activity for 30+ minutes while clocked in
- **Example:** Last activity was 45 minutes ago
- **Action:** Call staff to confirm they're working

### 3. **No Calls Made** (CRITICAL Severity)

- **Trigger:** Clocked in for 3+ hours with zero calls
- **Example:** Staff worked 5 hours with 0 calls
- **Action:** Investigate why no calls were made

### 4. **Overnight Timer** (CRITICAL Severity)

- **Trigger:** Timer running for 16+ hours
- **Example:** Clocked in yesterday, never clocked out
- **Action:** Clock out manually and discuss with staff

### 5. **Excessive Background Time** (HIGH Severity)

- **Trigger:** Background time > 70% of total time
- **Example:** 5 hours worked, 3.5 hours in background (70%)
- **Action:** Warn staff about keeping app open

---

## 📊 Real-Time Features

### Auto-Refresh

- Dashboard refreshes every **30 seconds** automatically
- Shows "Last updated" timestamp
- Manual refresh button available

### Real-Time Updates

- WebSocket subscriptions to `hr_staff_attendance` table
- Instant alert updates when staff behavior changes
- Live active/idle status indicators

### Live Metrics

- **Active Time %** - Green (70%+), Yellow (50-70%), Red (<50%)
- **Last Activity** - Minutes since last heartbeat
- **Status** - 🟢 Active (< 2 minutes) or ⚪ Idle

---

## 🎯 Understanding the Metrics

### Active Work Seconds

Time when app is **in foreground** and staff is actively using it.

### Background Seconds

Time when app is **in background** (minimized, staff doing something else).

### Active Percentage

```
Active % = (Active Seconds / Total Seconds) * 100
```

Good: **70%+** (mostly active)  
Warning: **50-70%** (moderate activity)  
Bad: **<50%** (mostly idle/background)

### Last Activity Time

Timestamp of last **heartbeat** from mobile app.

- Active: < 2 minutes ago
- Idle: > 2 minutes ago
- Warning: > 30 minutes ago

---

## 🔔 Alert Severity Levels

### 🔴 CRITICAL

- Requires **immediate action**
- Examples: No calls made, overnight timer
- Manager should contact staff ASAP

### 🟠 HIGH

- Requires **attention soon**
- Examples: Low active time, extended idle
- Manager should review today

### 🟡 MEDIUM

- Should be **monitored**
- Examples: Pattern anomalies
- Manager should check this week

### 🔵 LOW

- **Informational** only
- Examples: Minor deviations
- No action needed

---

## 📱 Staff View vs Manager View

### Staff Don't See This

- HR Staff **CANNOT** see the Manipulation Monitor
- Only managers and admins have access
- Staff only see their own performance dashboard

### Managers See Everything

- All staff activity
- All alerts across the team
- Real-time monitoring
- Historical patterns

---

## ⚙️ Customizing Alert Thresholds

Edit `HRManipulationMonitor.tsx` to adjust thresholds:

```typescript
// Low active time threshold
if (activePercentage < 40 && totalSeconds > 3600) {
  // Change 40 to 30 for 30% threshold
  // Change 3600 to 7200 for 2-hour minimum
}

// Idle time threshold
if (lastActivityMinutes > 30) {
  // Change 30 to 60 for 1-hour threshold
}

// No calls threshold
const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
// Change 3 to 2 for 2-hour threshold
// Change 3 to 4 for 4-hour threshold

// Overnight timer threshold
if (hoursRunning > 16) {
  // Change 16 to 12 for 12-hour threshold
}

// Background time threshold
if (backgroundPercentage > 70 && totalSeconds > 3600) {
  // Change 70 to 80 for 80% threshold
}
```

---

## 🧪 Testing the System

### Test Scenario 1: Low Active Time

1. Have a staff member clock in
2. Keep app mostly in background for 2 hours
3. Check Manipulation Monitor
4. Should see "LOW_ACTIVE_TIME" alert

### Test Scenario 2: No Calls

1. Have a staff member clock in
2. Don't make any calls for 3+ hours
3. Check Manipulation Monitor
4. Should see "NO_CALLS_MADE" alert

### Test Scenario 3: Extended Idle

1. Have a staff member clock in
2. Stop using app (no heartbeat) for 30+ minutes
3. Check Manipulation Monitor
4. Should see "EXTENDED_IDLE" alert

### Test Scenario 4: Normal Behavior

1. Have a staff member clock in
2. Keep app active, make regular calls
3. Check Manipulation Monitor
4. Should see "✅ No manipulation detected"

---

## 📊 Sample Alert Display

```
🔴 CRITICAL | NO_CALLS_MADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ahmed Mohammed
ahmed@company.com

No calls made in 5 hours of work

[Take Action]

▼ View Details
{
  "clock_in_time": "2025-11-28T09:00:00Z",
  "hours_worked": 5,
  "calls_made": 0
}
```

---

## 🎨 UI Features

### Color-Coded Alerts

- **Red border** - CRITICAL severity
- **Orange border** - HIGH severity
- **Yellow border** - MEDIUM severity
- **Blue border** - LOW severity

### Active Staff Cards

- **Green badge** - Currently active (< 2min)
- **Gray badge** - Currently idle
- **Active % colors** - Green/Yellow/Red based on performance

### Auto-Refresh Indicator

- Spinning refresh icon when loading
- Timestamp shows last update time
- Manual refresh button always available

---

## ✅ Success Checklist

- [ ] Component created: `HRManipulationMonitor.tsx`
- [ ] Integrated into HRDashboard
- [ ] "Manipulation Monitor" tab visible for managers
- [ ] Can see active staff list
- [ ] Can see alerts (or "No manipulation detected")
- [ ] Real-time updates working (30-second refresh)
- [ ] Alert details expandable
- [ ] Active/Idle status showing correctly
- [ ] Active percentage color-coded
- [ ] Last activity time displaying

---

## 🎯 Expected Results

After implementation, you should:

✅ See the new **"Manipulation Monitor"** tab in sidebar  
✅ View all active staff with real-time metrics  
✅ Get alerts for suspicious behavior  
✅ See color-coded severity levels  
✅ Monitor active vs background time  
✅ Track last activity timestamps  
✅ Detect manipulation patterns  
✅ Take action on alerts

---

## 🔒 Security & Privacy

### What Managers Can See

- Active vs background time
- Last activity timestamp
- Call count and productivity
- Alerts for suspicious behavior

### What Managers CANNOT See

- Exact app screens viewed
- Personal messages
- Location tracking (unless you add it)
- Screen captures

### Compliance

- Monitors work-related activity only
- Transparent to staff (they know it tracks time)
- No invasion of privacy
- Only work hours tracked

---

## 📞 Support

If you encounter issues:

### Check Browser Console

```javascript
// Look for errors in browser console
console.log("Monitoring data:", { alerts, activeStaff });
```

### Verify Database Tables

```sql
-- Check if attendance table has required columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'hr_staff_attendance';

-- Should have: active_work_seconds, background_seconds, last_activity_time
```

### Test Queries Manually

```javascript
// Test in browser console
const { data } = await supabase
  .from("hr_staff_attendance")
  .select("*")
  .eq("is_active", true);
console.log("Active staff:", data);
```

---

## 🎉 You're Done!

The manipulation monitoring system is **fully implemented** and ready to use!

Just:

1. Login as HR Manager or Admin
2. Click **"Manipulation Monitor"** in sidebar
3. Start monitoring your team in real-time

**The system will automatically detect and alert you to any manipulation attempts!** 🕵️🔒

---

_Created: November 28, 2025_  
_Status: ✅ Ready for Production_  
_Integration: ✅ Complete_
