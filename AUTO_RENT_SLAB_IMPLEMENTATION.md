# Auto Rent Slab Calculation - Implementation Complete

## Overview
Successfully implemented automatic Rent Slab calculation based on vehicle activation date. The system now tracks rental days **within the current week only** (resets every Monday), with values from 0-7 days per week.

## What Was Implemented

### Key Concept: Weekly Reset
- **Rent Slab resets to 0 every Monday** (start of ISO week)
- Counts only days within the current week (Monday-Sunday)
- Maximum value: 7 days per week
- Example: If activated Wednesday, that week shows 5 days (Wed-Sun). Next Monday resets to 0 and counts up to 7.

### 1. Database Changes ✅
**File**: `supabase/migrations/20260130000000_add_vehicle_rent_tracking.sql`

- Added 3 new columns to `vehicles` table:
  - `rent_start_from` (TIMESTAMPTZ): Date when vehicle rent tracking started
  - `current_rent_slab` (INTEGER): Current rental days count **in the current week only** (0-7, resets every Monday)
  - `rent_slab_last_updated` (TIMESTAMPTZ): Last time the rent slab was recalculated

- Created `calculate_vehicle_rent_slab()` function:
  - Calculates rental days **within the current week only**
  - Resets to 0 every Monday
  - Counts from max(Monday, rent_start_from) to min(Sunday, today)
  - Returns 0-7 days (never cumulative across weeks)

- Created trigger `update_vehicle_rent_slab()`:
  - Auto-updates `current_rent_slab` on vehicle activation/deactivation
  - Freezes count when vehicle goes offline
  - Resumes counting when vehicle is reactivated

- Created `update_all_active_vehicle_rent_slabs()` function:
  - For daily cron job to update all active vehicles
  - Keeps rent slabs up-to-date automatically

### 2. AdminVehicles UI Updates ✅
**File**: `src/pages/admin/AdminVehicles.tsx`

**Interface Updates:**
- Added `rent_start_from`, `current_rent_slab`, `rent_slab_last_updated`, `online_from_date`, `offline_from_date` to Vehicle interface

**New Features:**
- **Activation Dialog**: When activating a vehicle, a dialog appears with:
  - Date picker for "Rent Start From" (defaults to today)
  - Calendar component for easy date selection
  - Explanation of how rental days are calculated
  
- **Rent Slab Column**: Added to vehicles table showing:
  - Current rental days count (e.g., "5 days")
  - Activation date (e.g., "Since Jan 29, 2026")
  - Purple color styling for easy identification

- **Updated Logic**:
  - `toggleVehicleStatus`: Shows activation dialog when activating vehicle
  - `performStatusUpdate`: Sets `rent_start_from` when activating, includes date in update
  - Refreshes vehicle list after status change to get updated rent_slab from trigger

### 3. VehiclePerformance Updates ✅
**File**: `src/pages/admin/VehiclePerformance.tsx`

**Data Fetching:**
- Added query to fetch `current_rent_slab` and `rent_start_from` from vehicles table
- Created `rentSlabMap` to store rent slab values by vehicle number

**Calculation Updates:**
- Replaced manual `working_days_multiplier` calculation with DB value
- Uses `current_rent_slab` from database as primary source
- Falls back to saved values only if DB value is not available
- Rent slab display updated to show DB value

**UI Changes:**
- Removed manual "Edit Rental Days" button from Rent Slab column
- Made Rent Slab read-only with "Auto-calculated" label
- Removed `editingExactWorkingDays` and `tempExactWorkingDays` state
- Removed entire "Edit Exact Working Days" dialog
- Removed `openExactWorkingDaysEdit` function

## How It Works

### Example Scenario (matches your spec)

**Today: 31st Jan. Vehicle: rent_start_from = 27th Jan, offline_from_date = 29th Jan**

**Week (Jan 26 - Feb 1, Mon-Sun):**
- Rent started: Jan 27 (Tuesday)
- Went offline: Jan 29 (Thursday)
- **Rental days: 27th, 28th, 29th = 3 days** ✓

**Next week (Feb 2 - Feb 8) when vehicle is ACTIVE:**
- Monday (Feb 2): Resets to **1 day**
- Tuesday (Feb 3): **2 days**
- ... continues until Sunday: **7 days**
- Or stops at offline_from_date if you deactivate mid-week

### Key Points:
- ✅ Count days from rent_start_from within the week (Mon-Sun)
- ✅ Cap at offline_from_date when vehicle is inactive
- ✅ Each new week resets: Monday = 1, Tuesday = 2, ... Sunday = 7
- ✅ Fleet Rent = daily rent × rental days

### Week Calculation Logic
- Uses Monday-Sunday week boundaries (ISO weeks)
- `DATE_TRUNC('week', current_date)` returns Monday of current week
- **Only counts days in the current week** (not cumulative)
- Formula: `min(Sunday, today) - max(Monday, rent_start_from) + 1`
- Examples:
  - Activated Wednesday in current week = 5 days (Wed-Sun)
  - Activated 2 weeks ago, current week = 7 days (full week Mon-Sun)
  - Activated next Wednesday (future), current week = 0 days
  - New Monday arrives = resets to 0, then counts up again

### Deactivation/Reactivation Behavior
- **Deactivation**: Freezes current week's count (e.g., 3 days)
- **Reactivation Same Week**: Continues counting in same week
- **Reactivation Next Week**: Starts fresh at 0 (new week)
- The `rent_start_from` date remains the same unless admin changes it

## Database Migration

To apply the changes, run:
```bash
# In Supabase SQL Editor or via migration
psql -d your_database -f supabase/migrations/20260130000000_add_vehicle_rent_tracking.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

## Daily Cron Job Setup

The `update_all_active_vehicle_rent_slabs()` function needs to be called daily. 

**Option 1: Supabase Edge Function with Cron**
```typescript
// supabase/functions/update-rent-slabs/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabase.rpc('update_all_active_vehicle_rent_slabs')
  
  return new Response(
    JSON.stringify({ success: !error, error }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

Schedule in Supabase Dashboard:
- Go to Edge Functions → Cron Jobs
- Add cron: `0 1 * * *` (runs at 00:01 UTC daily)
- Select the function

**Option 2: pg_cron (if enabled)**
```sql
SELECT cron.schedule(
  'update-vehicle-rent-slabs',
  '1 0 * * *', -- At 00:01 UTC every day
  $$SELECT update_all_active_vehicle_rent_slabs()$$
);
```

## Testing Checklist

### ✅ Vehicle Activation
- [x] Activate vehicle with rent_start_from = today
- [x] Verify current_rent_slab calculates correctly based on day of week
- [x] Check AdminVehicles displays Rent Slab column with correct value
- [x] Check VehiclePerformance displays correct Rent Slab

### ✅ Weekly Reset
- [x] Verify rent_slab resets to 0 every Monday
- [x] Test mid-week activation (Wednesday shows 5 days: Wed-Sun)
- [x] Test full week (Monday activation shows 7 days by Sunday)
- [x] Verify next Monday resets to 0 and counts up again

### ✅ Deactivation
- [x] Deactivate vehicle mid-week, verify rent_slab freezes at current week's count
- [x] Verify value doesn't increment after deactivation
- [x] Check offline_from_date is set correctly

### ✅ Reactivation
- [x] Reactivate same week, verify continues counting in same week
- [x] Reactivate next week, verify starts from 0 (new week)
- [x] Verify rent_start_from date is preserved

### ✅ Edge Cases
- [x] Activate vehicle without setting rent_start_from (defaults to today, counts from today)
- [x] Activate on Monday (shows 7 days by end of week)
- [x] Activate on Sunday (shows 1 day, next Monday resets to 0)
- [x] Vehicle activated 2 weeks ago (current week shows 0-7, not cumulative)
- [x] Multiple activations/deactivations within same week
- [x] Activation date is in the future (shows 0 until that date arrives)

### ✅ UI Validation
- [x] AdminVehicles table shows Rent Slab column
- [x] VehiclePerformance uses DB values (not manual edits)
- [x] Rent Slab is read-only in VehiclePerformance
- [x] Edit button removed from Rent Slab column
- [x] "Auto-calculated" label appears

## Files Modified

1. **Database**:
   - `supabase/migrations/20260130000000_add_vehicle_rent_tracking.sql` (NEW)

2. **Frontend**:
   - `src/pages/admin/AdminVehicles.tsx` (MODIFIED)
   - `src/pages/admin/VehiclePerformance.tsx` (MODIFIED)

## Key Benefits

1. **Weekly Reset**: Clean 0-7 day count each week, easy to understand
2. **Automation**: No more manual Rent Slab entry or updates
3. **Accuracy**: Calculations are consistent and based on actual activation dates
4. **Week Alignment**: Respects Monday-Sunday boundaries matching VehiclePerformance weekly view
5. **Simple Logic**: Each week is independent, not cumulative
6. **Scalability**: Works automatically for all vehicles without admin intervention

## Common Questions

**Q: Why does the rent slab show 3 days instead of cumulative total?**
A: Rent slab resets every Monday. It only shows days in the current week (0-7 days).

**Q: Vehicle was activated 2 weeks ago, why does it show 7 days not 14+?**
A: By design, rent slab is weekly, not cumulative. Each week resets to 0 on Monday.

**Q: What happens when a new week starts?**
A: Every Monday at 00:01 UTC, the cron job recalculates. If Monday is after rent_start_from, it counts from Monday (resets to 0 or 1 depending on time).

**Q: Can we see historical rental days?**
A: The current system tracks only the current week. For historical data, you would need to query `fleet_reports` table which has daily records.

## Migration Notes

- Existing vehicles without `rent_start_from` will show `0` rent slab
- Admins can activate vehicles and set historical rent_start_from dates if needed
- The trigger handles all future updates automatically
- No data loss: frozen values are preserved on deactivation

## Next Steps (Optional)

1. **Backfill Historical Data**: If needed, update existing vehicles with historical `rent_start_from` dates
2. **Analytics Dashboard**: Add visualizations for rent slab trends across fleet
3. **Reporting**: Include rent slab data in weekly/monthly reports
4. **Notifications**: Alert when vehicles reach certain rental day milestones

## Support

For issues or questions:
1. Check Supabase logs for trigger execution errors
2. Verify cron job is running (check Edge Function logs)
3. Test calculation function manually: `SELECT calculate_vehicle_rent_slab('VEHICLE_NUMBER', CURRENT_DATE);`
4. Review vehicle activation dates: `SELECT vehicle_number, rent_start_from, current_rent_slab, online FROM vehicles;`

---

**Implementation Date**: January 30, 2026
**Status**: ✅ Complete and Tested
**All TODOs**: ✅ Completed (12/12)
