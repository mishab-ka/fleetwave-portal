# 📊 HR Performance Tracking - System Flow Diagram

## 🔄 Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     HR STAFF MAKES A CALL                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              HRStaffLeads.tsx - saveCallData()                   │
│  • Saves call to hr_call_tracking table                         │
│  • Updates lead in hr_leads table                               │
│  • Logs activity in hr_lead_activities                          │
│  • Calls aggregate_daily_stats() function                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐   ┌──────────────────┐
        │  DATABASE TRIGGER│   │  MANUAL RPC CALL │
        │  Automatically   │   │  From Frontend   │
        │  fires after     │   │  JavaScript      │
        │  INSERT/UPDATE   │   │                  │
        └──────────────────┘   └──────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
        ┌───────────────────────────────────────────┐
        │  aggregate_daily_stats() FUNCTION         │
        │  • Counts total calls for the day         │
        │  • Calculates successful vs failed calls  │
        │  • Computes conversion rate               │
        │  • Aggregates by status & source          │
        │  • Links attendance data (work hours)     │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │  hr_staff_daily_stats TABLE               │
        │  • One row per staff per day              │
        │  • Stores all computed metrics            │
        │  • UPSERT (updates if exists)             │
        └───────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
    ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ HRPerformance  │ │ HRDailyHistory│ │ HRStaffPortal│
    │ Analytics      │ │               │ │              │
    │ • Calls Today  │ │ • Daily Stats │ │ • My Stats   │
    │ • This Week    │ │ • Trends      │ │ • Performance│
    │ • This Month   │ │ • Filters     │ │              │
    └────────────────┘ └──────────────┘ └──────────────┘
```

## 📊 Table Relationships

```
┌─────────────────────┐
│     auth.users      │
│                     │
│  id (UUID)          │───┐
│  name               │   │
│  role               │   │
└─────────────────────┘   │
                          │
                          │ staff_user_id (FK)
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  hr_leads    │  │hr_call_tracking│ │hr_staff_daily│
│              │  │                │ │    _stats    │
│  id          │──│lead_id (FK)    │ │              │
│  phone       │  │staff_user_id   │ │staff_user_id │
│  status      │  │called_date ────┼─│date          │
│  joining_date│  │status          │ │total_calls   │
└──────────────┘  │call_duration   │ │successful    │
                  │source          │ │conversion_%  │
                  └──────────────┘ │hot_leads     │
                                   │leads_joined  │
                                   └──────────────┘
```

## 🔧 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HRDashboard.tsx                          │
│                  (Main Navigation Container)                 │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  HR Manager  │    │   HR Staff   │    │    Admin     │
│    Tabs      │    │     Tabs     │    │     Tabs     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
  • Overview          • Overview          • All Manager
  • Leads             • Leads               Tabs Plus:
  • Staff             • WhatsApp          • System
  • WhatsApp          • Performance         Settings
  • Statuses          • Daily History     • Full Access
  • Calendar
  • Performance
  • Daily History ◄── NEW!
  • Live Activity
  • Targets
  • Alerts
  • Settings
```

## 🎯 "Calls Today" Logic Flow

### Before Fix (BROKEN) ❌
```
1. Fetch hr_call_tracking with called_date >= startDate
2. For each call:
   const callDate = new Date(call.called_date)  ← PROBLEM: Timezone conversion
   const today = new Date()
   if (callDate.toDateString() === today.toDateString())  ← FAILS due to timezone
      staffMetrics[staffId].calls_today++
```

### After Fix (WORKING) ✅
```
1. Fetch hr_call_tracking with called_date >= startDate
2. Get today as string: const todayString = now.toISOString().split("T")[0]
   → Example: "2025-11-28"
3. For each call:
   const callDateString = call.called_date  ← Already in "YYYY-MM-DD" format
   if (callDateString === todayString)  ← Direct string comparison, no timezone
      staffMetrics[staffId].calls_today++
```

## 📅 Date Format Standards

```
┌─────────────────────────────────────────────────────────────┐
│               DATE FORMATS USED IN SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Database (called_date):    DATE                            │
│    Storage:                 "2025-11-28"                    │
│    Format:                  YYYY-MM-DD                      │
│                                                              │
│  JavaScript (frontend):     new Date().toISOString()        │
│    Full:                    "2025-11-28T14:30:00.000Z"     │
│    Split[0]:                "2025-11-28"                    │
│                                                              │
│  Comparison Method:         String === String               │
│    Example:                 "2025-11-28" === "2025-11-28"  │
│    Benefit:                 No timezone conversion          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security & Permissions

```
┌──────────────────────────────────────────────────────────┐
│            Row Level Security (RLS) Policies              │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  hr_staff_daily_stats:                                   │
│                                                           │
│  SELECT Policy:                                          │
│    ✓ All authenticated users can read                   │
│                                                           │
│  INSERT/UPDATE/DELETE Policy:                            │
│    ✓ Staff can edit their own records                   │
│      (staff_user_id = auth.uid())                       │
│    ✓ HR Managers can edit all records                   │
│      (user.role = 'hr_manager')                         │
│    ✓ Admins can edit all records                        │
│      (user.role = 'admin')                              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## ⚡ Performance Optimizations

```
┌──────────────────────────────────────────────────────────┐
│                  Database Indexes                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  hr_staff_daily_stats:                                   │
│    • idx_hr_staff_daily_stats_staff_date                │
│      (staff_user_id, date DESC)                         │
│      → Fast queries by staff and date range             │
│                                                           │
│    • idx_hr_staff_daily_stats_date                      │
│      (date DESC)                                         │
│      → Fast queries across all staff by date            │
│                                                           │
│    • idx_hr_staff_daily_stats_staff                     │
│      (staff_user_id)                                     │
│      → Fast queries for individual staff                │
│                                                           │
│  UNIQUE Constraint:                                      │
│    (staff_user_id, date)                                │
│    → Prevents duplicate daily records                   │
│    → Enables UPSERT operations                          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## 🔄 Automatic Updates Flow

```
SCENARIO 1: Call is Made
─────────────────────────

User Action → HRStaffLeads.saveCallData()
                     ↓
            INSERT hr_call_tracking
                     ↓
            ┌────────┴────────┐
            ▼                 ▼
    Database Trigger    Frontend RPC
    (backup/safety)    (immediate update)
            │                 │
            └────────┬────────┘
                     ▼
         aggregate_daily_stats()
                     ↓
         UPSERT hr_staff_daily_stats
                     ↓
            UI Auto-Refreshes


SCENARIO 2: Staff Clocks In/Out
────────────────────────────────

Attendance Recorded → hr_staff_attendance
                            ↓
                    Database Trigger
                            ↓
                aggregate_daily_stats()
                            ↓
        Updates total_work_hours in daily stats
                            ↓
                  UI Shows Work Hours
```

## 📈 Metrics Calculation Logic

```
┌──────────────────────────────────────────────────────────┐
│         Daily Stats Calculation Formula                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  total_calls:                                            │
│    COUNT(*) FROM hr_call_tracking                       │
│    WHERE staff_user_id = X AND called_date = Y          │
│                                                           │
│  successful_calls:                                       │
│    COUNT(*) WHERE status IN                             │
│    ('joined', 'hot_lead', 'callback')                   │
│                                                           │
│  failed_calls:                                           │
│    COUNT(*) WHERE status IN                             │
│    ('not_interested', 'call_not_picked', 'wrong_number')│
│                                                           │
│  conversion_rate:                                        │
│    (successful_calls / total_calls) * 100               │
│                                                           │
│  avg_call_duration:                                      │
│    AVG(call_duration) in seconds                        │
│                                                           │
│  total_call_duration:                                    │
│    SUM(call_duration) in seconds                        │
│                                                           │
│  status_breakdown:                                       │
│    JSONB: { "joined": 5, "hot_lead": 12, ... }        │
│                                                           │
│  source_breakdown:                                       │
│    JSONB: { "whatsapp": 10, "facebook": 7, ... }      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## 🎨 UI Component Hierarchy

```
HRDashboard
  ├─ HRDailyHistory (NEW!)
  │    ├─ Summary Cards (4)
  │    │    ├─ Total Calls
  │    │    ├─ Successful Calls
  │    │    ├─ Leads Joined
  │    │    └─ Avg Conversion
  │    ├─ Filters
  │    │    ├─ Time Range Select
  │    │    └─ Staff Select (managers only)
  │    └─ Daily Stats Table
  │         ├─ Date Column
  │         ├─ Staff Column (managers only)
  │         ├─ Metrics Columns
  │         └─ Trend Indicators
  │
  ├─ HRPerformanceAnalytics (FIXED!)
  │    ├─ Performance Overview Cards
  │    ├─ Staff Performance Table
  │    │    └─ Calls Today (NOW WORKING!)
  │    └─ Recent Calls Table
  │
  └─ HRStaffLeads
       └─ Call Dialog
            └─ Save Call
                 └─ Triggers Stats Update
```

## 🚀 Future Enhancements (Optional)

```
┌──────────────────────────────────────────────────────────┐
│          Potential Future Features                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Real-time Websocket Updates                          │
│     → Live stats refresh without page reload            │
│                                                           │
│  2. Export to CSV/Excel                                  │
│     → Download daily history reports                    │
│                                                           │
│  3. Performance Alerts                                   │
│     → Notify when conversion rate drops                 │
│                                                           │
│  4. Goal Setting & Tracking                              │
│     → Set daily/weekly/monthly targets                  │
│                                                           │
│  5. Advanced Charts                                      │
│     → Line charts, bar charts, pie charts               │
│                                                           │
│  6. Comparative Analytics                                │
│     → Compare staff performance side-by-side            │
│                                                           │
│  7. AI-Powered Insights                                  │
│     → Suggest best times to call, predict conversion    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

This diagram provides a comprehensive visual overview of how the entire HR performance tracking system works, from data entry to display! 🎉

