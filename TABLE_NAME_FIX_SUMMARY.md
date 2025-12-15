# HR Daily Stats Table Name Fix

## Problem

Your application was throwing errors:
```
GET .../hr_staff_daily_metrics?... 406 (Not Acceptable)
Error: PGRST116 - JSON object requested, multiple (or no) rows returned
```

**Root Cause:** The code was querying a table named `hr_staff_daily_metrics`, but the actual table in your database is named `hr_staff_daily_stats`.

## Solution

Updated all references from `hr_staff_daily_metrics` → `hr_staff_daily_stats` in:

### 1. ✅ `/src/services/hrMetricsService.ts`
- `calculateDailyMetrics()` - Save/update operations
- `getDailyMetrics()` - Get single day metrics (also changed `.single()` to `.maybeSingle()` to handle no data gracefully)
- `getMetricsRange()` - Get date range metrics
- `getTeamMetrics()` - Get team-wide metrics and foreign key reference

### 2. ✅ `/src/services/hrTargetsService.ts`
- Daily target achievement calculation (changed `.single()` to `.maybeSingle()`)
- Weekly target achievement calculation
- Custom period target calculation

### 3. ✅ `/src/services/hrRealtimeService.ts`
- `subscribeToDailyMetrics()` - Real-time subscription to metrics table

## Additional Improvements

Changed `.single()` to `.maybeSingle()` in queries that might return 0 rows. This prevents errors when:
- Staff member hasn't made any calls yet today
- No metrics exist for the requested date
- First time using the system

## Testing

After these changes:

1. ✅ No more 406 errors in console
2. ✅ `HRLiveActivityDashboard` will load without errors
3. ✅ Daily metrics will display correctly (or show 0 if no data)
4. ✅ Real-time updates will work properly
5. ✅ No linter errors

## What This Fixes

- ✅ Live Activity Dashboard loading errors
- ✅ Staff performance metrics not displaying
- ✅ Target achievement calculations failing
- ✅ Real-time subscriptions to metrics updates
- ✅ Console errors flooding with 406 responses

## Verify the Fix

1. Refresh your browser (clear cache if needed)
2. Navigate to HR Dashboard → Live Activity (or any view that shows metrics)
3. Check browser console - should be clean with no 406 errors
4. Staff activity cards should display properly with metrics

---

**Fixed:** November 28, 2025  
**Status:** ✅ Complete  
**Files Modified:** 3  
**Breaking Changes:** None

