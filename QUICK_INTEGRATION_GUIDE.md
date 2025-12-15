# Quick Integration Guide - HR Performance Monitoring

## 🎯 Goal
Add the new HR performance monitoring components to your existing HRDashboard in 30 minutes.

## ✅ What's Already Done
- ✅ All database tables created
- ✅ All backend services implemented
- ✅ All core UI components built
- ✅ Clock-in widget ready
- ✅ Live activity dashboard ready
- ✅ Alert center ready
- ✅ Target management ready
- ✅ Activity timeline ready

## 🚀 Integration Steps

### Step 1: Run Database Migrations (5 min)

1. Open Supabase SQL Editor
2. Run `supabase/HR_PERFORMANCE_MONITORING_SCHEMA.sql`
3. Run `supabase/ENHANCE_HR_CALL_TRACKING.sql`
4. Verify tables created:
   - hr_staff_attendance
   - hr_staff_targets
   - hr_staff_daily_metrics
   - hr_performance_alerts
   - hr_staff_activity_log

### Step 2: Add Clock-In Widget to HRDashboard (5 min)

**File:** `src/components/HRDashboard.tsx`

```typescript
// Add import at top
import HRClockInWidget from "@/components/HRClockInWidget";

// In the header section (around line 394), add:
<div className="flex items-center gap-4">
  {/* Existing header content */}
  
  {/* Add clock-in widget for HR staff */}
  {userRole === "hr_staff" && (
    <HRClockInWidget compact={true} />
  )}
</div>
```

### Step 3: Add New Tabs for Managers (5 min)

**File:** `src/components/HRDashboard.tsx`

```typescript
// Update getAvailableTabs() function for hr_manager (around line 190)
if (userRole === "hr_manager" || userRole === "admin") {
  return [
    // ... existing tabs ...
    {
      id: "live_activity",
      label: "Live Activity",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: "targets",
      label: "Targets",
      icon: <Target className="w-4 h-4" />,
    },
    // ... rest of tabs
  ];
}
```

### Step 4: Add Component Imports (2 min)

**File:** `src/components/HRDashboard.tsx`

```typescript
// Add at top with other imports
import HRLiveActivityDashboard from "@/components/HRLiveActivityDashboard";
import HRTargetManagement from "@/components/HRTargetManagement";
import HRAlertCenter from "@/components/HRAlertCenter";
import { Activity, Target } from "lucide-react"; // If not already imported
```

### Step 5: Render New Components (5 min)

**File:** `src/components/HRDashboard.tsx`

```typescript
// In the content area (around line 420), add these new tab contents:

{/* Live Activity Dashboard - For Managers */}
{activeTab === "live_activity" &&
  (userRole === "hr_manager" || userRole === "admin") && (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <HRLiveActivityDashboard />
    </div>
  )}

{/* Target Management - For Managers */}
{activeTab === "targets" &&
  (userRole === "hr_manager" || userRole === "admin") && (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <HRTargetManagement />
    </div>
  )}
```

### Step 6: Add Activity Logging (5 min)

**File:** `src/components/HRStaffLeads.tsx`

```typescript
// Add import
import { logActivity } from "@/services/hrActivityTracker";

// In useEffect (around line 99), add:
useEffect(() => {
  if (user) {
    fetchLeads();
    fetchLeadStatuses();
    // Log page view
    logActivity(user.id, "page_viewed", { page: "leads" });
  }
}, [user]);

// In handleCall function (around line 190), add:
const handleCall = async (lead: Lead) => {
  // Log call started
  await logActivity(user.id, "call_started", { 
    lead_id: lead.id,
    phone: lead.phone 
  });
  
  // ... existing code ...
};

// In saveCallData function (after successful save, around line 300), add:
await logActivity(user.id, "call_completed", {
  lead_id: selectedLead.id,
  duration: callDuration,
  status: callData.status,
});
```

### Step 7: Add Clock-In Prompt (5 min)

**File:** `src/components/HRDashboard.tsx`

```typescript
// Add imports
import { getAttendanceStatus } from "@/services/hrAttendanceService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Add state (around line 62)
const [showClockInPrompt, setShowClockInPrompt] = useState(false);

// Add useEffect to check clock-in status
useEffect(() => {
  if (user && userRole === "hr_staff") {
    checkClockInStatus();
  }
}, [user, userRole]);

const checkClockInStatus = async () => {
  if (!user) return;
  const status = await getAttendanceStatus(user.id);
  if (!status.isClockedIn) {
    // Show prompt after 2 seconds
    setTimeout(() => setShowClockInPrompt(true), 2000);
  }
};

// Add dialog before closing div (around line 770)
{/* Clock-In Prompt Dialog */}
{userRole === "hr_staff" && (
  <Dialog open={showClockInPrompt} onOpenChange={setShowClockInPrompt}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Clock In Required</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-gray-600">
          Please clock in to start your work session and begin tracking your performance.
        </p>
        <HRClockInWidget 
          onStatusChange={(isClockedIn) => {
            if (isClockedIn) {
              setShowClockInPrompt(false);
            }
          }} 
        />
      </div>
    </DialogContent>
  </Dialog>
)}
```

### Step 8: Set Default Targets (3 min)

Run this SQL in Supabase:

```sql
-- Create global daily target
INSERT INTO hr_staff_targets (
  staff_user_id,
  target_type,
  target_calls,
  target_conversions,
  target_duration,
  target_work_hours,
  start_date,
  is_active,
  is_global,
  created_by
) VALUES (
  NULL,                    -- NULL for global
  'daily',                 -- Daily target
  30,                      -- 30 calls per day
  10,                      -- 10 conversions per day
  240,                     -- 240 minutes (4 hours) of calls
  8.0,                     -- 8 hours work
  CURRENT_DATE,
  true,
  true,                    -- Global target
  (SELECT id FROM auth.users WHERE role = 'hr_manager' LIMIT 1)
);

-- Create weekly target
INSERT INTO hr_staff_targets (
  staff_user_id,
  target_type,
  target_calls,
  target_conversions,
  target_duration,
  target_work_hours,
  start_date,
  is_active,
  is_global,
  created_by
) VALUES (
  NULL,
  'weekly',
  150,                     -- 150 calls per week
  50,                      -- 50 conversions per week
  1200,                    -- 1200 minutes per week
  40.0,                    -- 40 hours per week
  CURRENT_DATE,
  true,
  true,
  (SELECT id FROM auth.users WHERE role = 'hr_manager' LIMIT 1)
);
```

## ✅ Verification Checklist

After integration, verify:

### For HR Staff:
- [ ] Clock-in widget appears in header
- [ ] Clock-in prompt shows on dashboard load (if not clocked in)
- [ ] Can clock in/out successfully
- [ ] Hours worked updates in real-time
- [ ] Activity is logged when viewing leads
- [ ] Activity is logged when making calls

### For HR Managers:
- [ ] "Live Activity" tab appears
- [ ] Can see all clocked-in staff in real-time
- [ ] Staff status shows (Active/Idle/Offline)
- [ ] "Targets" tab appears
- [ ] Can create global targets
- [ ] Can create individual staff targets
- [ ] Can edit/delete targets

## 🎯 Testing the System

### Test 1: Clock-In Flow
1. Login as HR staff
2. Dashboard should show clock-in prompt
3. Click "Clock In"
4. Widget should show "Clocked In" status
5. Hours worked should start counting

### Test 2: Activity Tracking
1. Navigate to Leads page
2. View a lead
3. Make a call
4. Check database: `SELECT * FROM hr_staff_activity_log ORDER BY timestamp DESC LIMIT 10;`
5. Should see page_viewed, call_started, call_completed entries

### Test 3: Live Dashboard
1. Login as HR manager
2. Navigate to "Live Activity" tab
3. Should see all clocked-in staff
4. Staff status should update every 30 seconds
5. Verify hours worked and calls today are displayed

### Test 4: Target Management
1. Login as HR manager
2. Navigate to "Targets" tab
3. Click "New Target"
4. Create a global daily target (30 calls)
5. Verify target appears in list
6. Create an individual target for specific staff
7. Verify both targets are saved

## 🐛 Troubleshooting

### Clock-in widget not showing
- Check user role is "hr_staff"
- Verify HRClockInWidget import
- Check console for errors

### Live dashboard empty
- Verify staff have clocked in
- Check hr_staff_attendance table has records for today
- Verify getActiveStaff() returns data

### Targets not saving
- Check user has hr_manager or admin role
- Verify hr_staff_targets table exists
- Check RLS policies allow insert

### Activity not logging
- Verify logActivity function is called
- Check hr_staff_activity_log table
- Verify user ID is correct

## 📊 Next Steps

After basic integration:

1. **Add to HRStaffOverview** (20 min)
   - Add clock-in widget
   - Add activity timeline
   - Add alert center
   - Add target progress

2. **Add to HRPerformanceAnalytics** (20 min)
   - Add live activity tab
   - Add alert center tab
   - Add team rankings
   - Add target vs actual charts

3. **Set up Automation** (30 min)
   - Create alert scheduler
   - Set up daily metrics calculation
   - Configure auto clock-out

4. **Mobile Optimization** (15 min)
   - Add clock-in to HRMobileView
   - Add target progress to overview
   - Add activity status indicator

## 🎉 You're Done!

Your HR Performance Monitoring System is now integrated! 

Staff can:
- ✅ Clock in/out
- ✅ Track their work hours
- ✅ See their targets
- ✅ Get performance feedback

Managers can:
- ✅ Monitor staff in real-time
- ✅ Set and manage targets
- ✅ View performance alerts
- ✅ Track team metrics

## 📚 Additional Resources

- `HR_PERFORMANCE_MONITORING_README.md` - Full system documentation
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- Service files - Function documentation in comments
- Component files - Props and usage examples

## 💡 Pro Tips

1. **Start with global targets** - Set realistic targets based on historical data
2. **Monitor the live dashboard** - Check staff activity regularly
3. **Review alerts daily** - Address issues early
4. **Adjust targets as needed** - Use the target management UI
5. **Export data regularly** - Keep records for analysis

## 🆘 Need Help?

Check:
1. Console logs for errors
2. Supabase logs for database errors
3. Network tab for API failures
4. Component prop types for correct usage

All components have TypeScript interfaces and error handling built-in!

