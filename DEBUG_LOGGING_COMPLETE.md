# Debug Logging Added to All Calendar Views

## Summary
Added console logging to all components that fetch and display adjustments, making it easier to debug why purple badges may or may not be showing.

## Changes Made

### 1. AdminReports.tsx ✅
**File:** `src/pages/admin/AdminReports.tsx`
**Function:** `fetchServiceDayAdjustments` (line 367-401)

**Added Logging:**
```typescript
console.log(`AdminReports: Fetched ${data?.length || 0} adjustments`);
```

**What This Shows:**
- How many adjustments were fetched for the current date filter
- Helps verify adjustments are being loaded

### 2. UberAuditManager.tsx - fetchReportSummary ✅
**File:** `src/components/admin/uber/UberAuditManager.tsx`
**Function:** `fetchReportSummary` (line 652-768)

**Added Logging:**
```typescript
console.log(`UberAudit ReportSummary: Fetched ${adjustments?.length || 0} adjustments`);
```

**What This Shows:**
- How many adjustments were fetched for the selected week
- Runs when viewing a driver's weekly audit

### 3. UberAuditManager.tsx - fetchCalendarData ✅
**File:** `src/components/admin/uber/UberAuditManager.tsx`
**Function:** `fetchCalendarData` (line 823-898)

**Added Logging:**
```typescript
console.log(`UberAudit: Fetched ${adjustments?.length || 0} adjustments for ${userId}`);

// In the map function:
if (hasAdjustment) {
  console.log(`UberAudit: Report has adjustment on ${report.rent_date}`);
}
```

**What This Shows:**
- How many adjustments were fetched for the specific driver
- Which dates have adjustments
- Runs when viewing weekly calendar in audit modal

### 4. AdminCalendar.tsx ✅
**File:** `src/pages/admin/AdminCalendar.tsx`
**Already added in previous fix**

**Logging:**
```typescript
console.log("Fetched adjustments:", data?.length || 0, "records");

// In the map function:
if (hasAdjustment) {
  console.log(`Report has adjustment: ${report.driverName} on ${report.date}`);
}
```

## Console Output Reference

When navigating through the application, you should see these messages:

### AdminReports Page
```
AdminReports: Fetched X adjustments
```
- X = number of adjustments matching current date filter

### AdminCalendar Page
```
Fetched adjustments: X records
Report has adjustment: [Driver Name] on [Date]
```
- Shows total adjustments and which reports have them

### UberAuditManager (when opening audit modal)
```
UberAudit ReportSummary: Fetched X adjustments
UberAudit: Fetched X adjustments for [user-id]
UberAudit: Report has adjustment on [date]
```
- Shows adjustments for both summary and calendar views

## How to Use This for Debugging

### Test Scenario 1: Check if Adjustments Are Loading
1. Open browser console (F12)
2. Navigate to any page with calendar/reports
3. Look for "Fetched X adjustments" messages
4. If X = 0, adjustments aren't in database or filters don't match

### Test Scenario 2: Check if Adjustments Are Being Matched
1. Open browser console
2. Navigate to calendar with known adjustment
3. Look for "Report has adjustment" messages
4. If you see "Fetched X adjustments" but no "Report has adjustment", the matching logic has an issue

### Test Scenario 3: Check Purple Badge Logic
1. Console shows adjustments loaded ✅
2. Console shows reports matched ✅
3. But no purple badge shows ❌
4. → Problem is in CalendarUtils.getStatusColor() or component rendering

## Debugging Flow Chart

```
Start
  ↓
Console shows "Fetched X adjustments"?
  ├─ No → Check database: SELECT * FROM common_adjustments WHERE status='approved'
  └─ Yes (X > 0) → Continue
       ↓
Console shows "Report has adjustment"?
  ├─ No → Check matching logic: user_id and adjustment_date must match exactly
  └─ Yes → Continue
       ↓
Purple badge shows?
  ├─ No → Check CalendarUtils.getStatusColor() - verify hasAdjustment parameter
  └─ Yes → ✅ Working correctly!
```

## All Components Now Have Logging

| Component | Function | Log Message |
|-----------|----------|-------------|
| AdminReports | fetchServiceDayAdjustments | `AdminReports: Fetched X adjustments` |
| AdminCalendar | fetchServiceDayAdjustments | `Fetched adjustments: X records` |
| AdminCalendar | fetchCalendarData | `Report has adjustment: [name] on [date]` |
| UberAuditManager | fetchReportSummary | `UberAudit ReportSummary: Fetched X adjustments` |
| UberAuditManager | fetchCalendarData | `UberAudit: Fetched X adjustments for [id]` |
| UberAuditManager | fetchCalendarData | `UberAudit: Report has adjustment on [date]` |

## Expected Console Output Examples

### Successful Load with Adjustments:
```
AdminReports: Fetched 3 adjustments
Fetched adjustments: 2 records
Report has adjustment: John Doe on 2024-01-15
Report has adjustment: Jane Smith on 2024-01-16
UberAudit ReportSummary: Fetched 1 adjustments
UberAudit: Fetched 1 adjustments for abc-123-def
UberAudit: Report has adjustment on 2024-01-15
```

### No Adjustments in Date Range:
```
AdminReports: Fetched 0 adjustments
Fetched adjustments: 0 records
UberAudit ReportSummary: Fetched 0 adjustments
UberAudit: Fetched 0 adjustments for abc-123-def
```

### Adjustments Exist But Not Matched:
```
AdminReports: Fetched 5 adjustments
(No "Report has adjustment" messages)
```
→ This indicates a matching problem - check user_id and date formats

## Files Modified

1. **`src/pages/admin/AdminReports.tsx`**
   - Line 396: Added console log for fetched adjustments

2. **`src/components/admin/uber/UberAuditManager.tsx`**
   - Line 705: Added console log for fetchReportSummary
   - Line 873: Added console log for fetchCalendarData
   - Line 879-881: Added console log when adjustment matches report

3. **`src/pages/admin/AdminCalendar.tsx`**
   - Already updated in previous fix

## Next Steps

1. **Test in browser:**
   - Open console (F12)
   - Navigate through all pages
   - Verify logging appears

2. **If purple badges still don't show:**
   - Check console output
   - Follow debugging flow chart above
   - Verify adjustment status = 'approved'
   - Verify report status = 'approved' or 'paid'

3. **Create test data:**
   - Create 1-2 adjustments with known dates
   - Submit reports for those dates
   - Approve the reports
   - Navigate to all calendar views
   - Verify console logs and purple badges

## Success Criteria

- ✅ Console shows adjustment fetch counts
- ✅ Console shows when reports match adjustments
- ✅ Easy to identify where adjustment logic breaks
- ✅ Consistent logging across all components
- ✅ Purple badges show when console confirms adjustments exist
