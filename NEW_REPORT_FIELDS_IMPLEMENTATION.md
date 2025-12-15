# New Report Fields Implementation Guide

## Overview

This document describes the new fields added to the fleet reporting system:

- **CNG Expense**: Track daily CNG fuel expenses
- **KM Runned**: Track kilometers traveled per day
- **Service Day**: Mark reports as service/maintenance days

## Database Changes

### SQL Migration

Run the following SQL script to add the new columns to your database:

```sql
-- File: ADD_NEW_REPORT_FIELDS.sql
ALTER TABLE fleet_reports
ADD COLUMN IF NOT EXISTS cng_expense DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS km_runned DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_service_day BOOLEAN DEFAULT FALSE;

-- Create an index for better query performance on service_day filter
CREATE INDEX IF NOT EXISTS idx_fleet_reports_service_day ON fleet_reports(is_service_day);

-- Optional: Add comments to describe the new columns
COMMENT ON COLUMN fleet_reports.cng_expense IS 'CNG expense for the day';
COMMENT ON COLUMN fleet_reports.km_runned IS 'Total kilometers run for the day';
COMMENT ON COLUMN fleet_reports.is_service_day IS 'Indicates if this is a service day report';
```

## Features Implemented

### 1. Submit Report Page (`SubmitReport.tsx`)

#### New Input Fields

- **CNG Expense (₹)**: Numeric input for daily CNG fuel costs
- **KM Runned**: Numeric input for kilometers traveled
- **Service Day Toggle**: Switch button to mark reports as service days

#### UI Changes

- Added two new input fields in the form after Platform Fee
- Added a styled toggle switch for service day marking
- Shows a confirmation message when service day is enabled
- All fields are optional

#### Validation

- CNG Expense and KM Runned accept numeric values (decimals allowed)
- Service Day is a boolean toggle (true/false)
- All fields default to 0 or false if not filled

### 2. Admin Reports Page (`AdminReports.tsx`)

#### New Table Columns

Added three new columns to the reports table:

1. **CNG**: Displays CNG expense with blue text color (₹)
2. **KM**: Displays kilometers run with purple text color
3. **🔧**: Service day indicator column
   - Shows ⚙️ icon in orange badge for service days
   - Empty for regular days

#### New Filter

Added **Service Day Filter** dropdown with three options:

- **All Reports**: Shows all reports (default)
- **⚙️ Service Days**: Shows only service day reports
- **📊 Regular Days**: Shows only regular day reports

Filter location: Between Status Filter and Date Filter buttons

#### Modal Updates

The edit report modal now includes:

- CNG Expense input field (editable)
- KM Runned input field (editable)
- Service Day toggle switch
  - Orange when enabled (⚙️ Service Day)
  - Gray when disabled (📊 Regular Day)

#### Export Feature

CSV exports now include the new fields:

- CNG Expense column
- KM Runned column
- Service Day column (shows "Yes" or "No")

## Data Flow

### Submit Report Flow

```
1. Driver fills form including new fields
   ├─ CNG Expense (optional)
   ├─ KM Runned (optional)
   └─ Service Day toggle (optional)

2. On submit:
   ├─ Data validated
   ├─ Report created with all fields
   └─ Saved to fleet_reports table
```

### Admin View Flow

```
1. Admin opens AdminReports page
   ├─ Can filter by service day status
   ├─ See all fields in table view
   └─ See service day indicator (⚙️)

2. Admin clicks report to edit
   ├─ Modal opens with all fields editable
   ├─ Can modify CNG, KM, and service day
   └─ Save updates to database

3. Admin exports reports
   └─ CSV includes all new fields
```

## Database Schema

### Updated `fleet_reports` Table Structure

```sql
fleet_reports
├─ id (uuid)
├─ user_id (uuid)
├─ driver_name (text)
├─ vehicle_number (text)
├─ total_trips (integer)
├─ total_earnings (decimal)
├─ toll (decimal)
├─ total_cashcollect (decimal)
├─ platform_fee (decimal)
├─ net_fare (decimal)
├─ rent_paid_amount (decimal)
├─ deposit_cutting_amount (decimal)
├─ cng_expense (decimal)          -- NEW
├─ km_runned (decimal)              -- NEW
├─ is_service_day (boolean)         -- NEW
├─ status (text)
├─ remarks (text)
├─ submission_date (timestamp)
├─ rent_date (date)
└─ ... (other fields)
```

## Usage Instructions

### For Drivers

#### Submitting a Report with New Fields

1. Navigate to Submit Report page
2. Fill in all regular fields (earnings, trips, etc.)
3. Scroll to new fields section:
   - Enter CNG expense if applicable
   - Enter kilometers traveled
   - Toggle "Service Day Report" if vehicle was serviced
4. Submit report as usual

#### Service Day Reports

- Use when vehicle undergoes maintenance/servicing
- Helps track non-operational days
- Admin can filter and analyze service patterns

### For Admins

#### Viewing Reports

1. Open Admin Reports page
2. Use Service Day filter dropdown to:
   - View all reports
   - View only service days
   - View only regular days
3. Check 🔧 column for service day indicator

#### Editing Reports

1. Click Eye icon on any report
2. Scroll to find new fields:
   - Edit CNG Expense
   - Edit KM Runned
   - Toggle Service Day status
3. Click "Save Changes"

#### Analyzing Data

- Filter by service days to see maintenance patterns
- Export CSV with all fields for analysis
- Track CNG expenses over time
- Monitor average kilometers per trip

## Statistics & Analytics

### Potential Reports You Can Generate

1. **CNG Efficiency**

   - Total CNG expense / Total kilometers
   - Average CNG per trip
   - CNG trends over time

2. **Service Day Tracking**

   - Count of service days per vehicle
   - Service frequency analysis
   - Downtime impact on operations

3. **Distance Metrics**
   - Average kilometers per day
   - Total kilometers per vehicle
   - Kilometers per trip efficiency

## API Integration

### Creating a Report (POST)

```javascript
const reportData = {
  // ... existing fields
  cng_expense: 500,
  km_runned: 150.5,
  is_service_day: false,
};

await supabase.from("fleet_reports").insert(reportData);
```

### Updating a Report (PATCH)

```javascript
await supabase
  .from("fleet_reports")
  .update({
    cng_expense: 550,
    km_runned: 160,
    is_service_day: true,
  })
  .eq("id", reportId);
```

### Querying Reports

```javascript
// Get all service day reports
const { data } = await supabase
  .from("fleet_reports")
  .select("*")
  .eq("is_service_day", true);

// Get reports with high CNG expense
const { data } = await supabase
  .from("fleet_reports")
  .select("*")
  .gte("cng_expense", 500);
```

## Troubleshooting

### Common Issues

1. **Fields not showing in table**

   - Run the SQL migration script
   - Refresh the page
   - Check browser console for errors

2. **Cannot save new field values**

   - Verify database columns exist
   - Check user permissions
   - Ensure RLS policies allow updates

3. **Service day filter not working**
   - Clear browser cache
   - Check if index was created
   - Verify filter state in React DevTools

## Future Enhancements

Potential improvements for these features:

1. Add CNG expense validation (min/max limits)
2. Calculate average fuel efficiency (KM per ₹)
3. Auto-alert when service day threshold reached
4. Dashboard chart for CNG trends
5. Compare CNG costs across vehicles
6. GPS integration for automatic KM tracking

## Files Modified

1. **SubmitReport.tsx**

   - Added form fields
   - Added state management
   - Updated submit handler

2. **AdminReports.tsx**

   - Updated Report interface
   - Added table columns
   - Added filter functionality
   - Updated modal
   - Updated CSV export

3. **ADD_NEW_REPORT_FIELDS.sql**
   - Database migration script

## Testing Checklist

- [ ] Run SQL migration script
- [ ] Submit new report with all fields filled
- [ ] Submit report with fields empty (defaults work)
- [ ] Toggle service day on/off
- [ ] View report in admin table
- [ ] Filter by service day
- [ ] Edit report fields in modal
- [ ] Export CSV and verify new columns
- [ ] Check mobile responsiveness
- [ ] Verify data persistence

## Support

For issues or questions:

1. Check browser console for errors
2. Verify SQL script ran successfully
3. Check Supabase table structure
4. Review RLS policies
5. Test with different user roles

---

**Version**: 1.0.0  
**Date**: October 22, 2025  
**Last Updated**: October 22, 2025



