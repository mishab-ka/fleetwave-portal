# Vehicle Actual Rent Implementation Guide

## Overview

This feature allows you to set a **fixed weekly rent** for each vehicle instead of calculating rent based on trip counts. This is useful for vehicles with custom rental agreements or special pricing.

## How It Works

### Rent Calculation Logic

The system now supports **two ways** to calculate vehicle rent:

1. **Calculated Rent (Default)**: Based on trip count × working days

   - Uses the fleet rent slabs from Admin Settings
   - Example: 100 trips = ₹740/day × 7 days = ₹5,180/week

2. **Fixed Actual Rent (New)**: Weekly fixed amount
   - Set manually per vehicle
   - Ignores trip count and working days
   - Example: Set ₹4,200/week regardless of trips

### Priority

- If `actual_rent` is set (> 0): Use fixed rent
- If `actual_rent` is 0 or null: Calculate based on trips

## Database Changes

### SQL Migration

Run this SQL script in your Supabase SQL Editor:

```sql
-- File: ADD_VEHICLE_ACTUAL_RENT.sql

-- Add actual_rent column to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS actual_rent DECIMAL(10, 2) DEFAULT 0;

-- Add comment to describe the column
COMMENT ON COLUMN vehicles.actual_rent IS 'Weekly fixed rent amount for this vehicle (₹)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_actual_rent ON vehicles(actual_rent);

-- Optional: Set default rent for existing vehicles (adjust as needed)
-- UPDATE vehicles SET actual_rent = 4200 WHERE actual_rent = 0 AND online = true;
```

### Schema Update

```sql
vehicles
├─ vehicle_number (text)
├─ total_trips (integer)
├─ online (boolean)
├─ actual_rent (decimal) -- NEW: Weekly fixed rent amount
└─ ... (other fields)
```

## Features Implemented

### 1. VehiclePerformance.tsx Updates

#### New Interface Fields

```typescript
interface VehiclePerformance {
  // ... existing fields
  actual_rent?: number; // The fixed rent amount
  uses_actual_rent?: boolean; // Flag indicating if using fixed rent
}
```

#### Rent Calculation Flow

```typescript
// Fetch actual rent from vehicles table
const vehicleActualRents = new Map<string, number>();

// In calculation loop:
if (actualRent && actualRent > 0) {
  // Use fixed weekly rent
  vehicle.total_rent = actualRent;
  vehicle.uses_actual_rent = true;
  vehicle.rent_slab = `Fixed Rent (₹${actualRent})`;
} else {
  // Calculate based on trips
  const dailyRent = getFleetRent(vehicle.total_trips);
  vehicle.total_rent = dailyRent * working_days_multiplier;
  vehicle.uses_actual_rent = false;
  vehicle.rent_slab = getRentSlab(vehicle.total_trips);
}
```

#### UI Updates

**Visual Indicators:**

- **Rent Slab Column**: Shows "Fixed Rent (₹X)" instead of trip-based slab
- **Blue Badge**: "Fixed Weekly Rent" badge appears below rent slab
- **Console Logs**: Shows which rent method is being used

**Before:**

```
Rent Slab: 80-109 trips (₹740)
```

**After (with actual rent):**

```
Rent Slab: Fixed Rent (₹4,200)
[Badge: Fixed Weekly Rent]
```

### 2. How to Set Actual Rent

#### Method 1: Direct Database Update (Quick)

```sql
-- Set rent for a specific vehicle
UPDATE vehicles
SET actual_rent = 4200
WHERE vehicle_number = 'DL01AB1234';

-- Set rent for multiple vehicles
UPDATE vehicles
SET actual_rent = 4500
WHERE vehicle_number IN ('DL01AB1234', 'DL01CD5678');

-- Remove fixed rent (revert to calculated)
UPDATE vehicles
SET actual_rent = 0
WHERE vehicle_number = 'DL01AB1234';
```

#### Method 2: Via AdminDrivers Page (Recommended)

_(Note: This requires updating AdminDrivers.tsx - see below)_

1. Navigate to Admin → Drivers
2. Find the vehicle/driver
3. Click "Edit" button
4. Set "Actual Rent" field
5. Save changes

## Usage Examples

### Scenario 1: High-Performing Vehicle

**Problem**: Vehicle consistently does 120+ trips, calculated rent is too low

**Solution**:

```sql
UPDATE vehicles
SET actual_rent = 5000
WHERE vehicle_number = 'DL01AB1234';
```

**Result**:

- Before: 120 trips = ₹560/day × 7 = ₹3,920/week
- After: Fixed ₹5,000/week

### Scenario 2: New Vehicle with Guarantee

**Problem**: New vehicle owner has 2-month guarantee of ₹4,500/week

**Solution**:

```sql
UPDATE vehicles
SET actual_rent = 4500
WHERE vehicle_number = 'DL01XY9876';
```

**After 2 months**, revert to calculated:

```sql
UPDATE vehicles
SET actual_rent = 0
WHERE vehicle_number = 'DL01XY9876';
```

### Scenario 3: Special Agreement

**Problem**: Vehicle has custom contract: ₹6,000/week flat

**Solution**:

```sql
UPDATE vehicles
SET actual_rent = 6000
WHERE vehicle_number = 'DL01PQ5432';
```

## Profit/Loss Impact

### Calculation Formula

**With Calculated Rent:**

```
Profit/Loss =
  Total Earnings
  + Additional Income
  + Transaction Income
  - (Daily Rent × Working Days)
  - Expenses
  - Transaction Expenses
```

**With Fixed Actual Rent:**

```
Profit/Loss =
  Total Earnings
  + Additional Income
  + Transaction Income
  - Fixed Actual Rent  // ← Changed
  - Expenses
  - Transaction Expenses
```

### Example Comparison

**Vehicle: DL01AB1234**

- Total Trips: 95
- Total Earnings: ₹6,000
- Working Days: 7

**Scenario A: Calculated Rent**

```
Daily Rent = ₹740 (80-109 trips bracket)
Total Rent = ₹740 × 7 = ₹5,180
Profit = ₹6,000 - ₹5,180 = ₹820
```

**Scenario B: Fixed Actual Rent (₹4,500)**

```
Total Rent = ₹4,500 (fixed)
Profit = ₹6,000 - ₹4,500 = ₹1,500
```

**Difference**: +₹680 profit with fixed rent

## Reporting & Analytics

### CSV Export

The exported CSV includes rent information:

```csv
Vehicle Number,Total Trips,Total Rent,Rent Slab,Uses Actual Rent
DL01AB1234,95,4500,"Fixed Rent (₹4,500)",Yes
DL01CD5678,110,3920,"110-124 trips (₹560)",No
```

### Filtering

You can filter vehicles by rent type:

```sql
-- Get all vehicles using fixed rent
SELECT vehicle_number, actual_rent
FROM vehicles
WHERE actual_rent > 0 AND online = true;

-- Get vehicles with calculated rent
SELECT vehicle_number
FROM vehicles
WHERE (actual_rent = 0 OR actual_rent IS NULL) AND online = true;
```

## Console Debugging

The system logs rent calculations:

```javascript
// For fixed rent:
console.log("DL01AB1234 - Using actual rent: ₹4500");

// For calculated rent:
console.log("DL01CD5678 - Calculated rent: ₹740 × 7 days = ₹5180");
```

## Bulk Operations

### Set Rent for Multiple Vehicles

```sql
-- Set same rent for all vehicles in a group
UPDATE vehicles
SET actual_rent = 4200
WHERE vehicle_number LIKE 'DL01%'
AND online = true;
```

### Set Rent Based on Conditions

```sql
-- Set fixed rent for vehicles with > 100 average trips
WITH vehicle_avg AS (
  SELECT vehicle_number, AVG(total_trips) as avg_trips
  FROM fleet_reports
  WHERE status = 'approved'
  GROUP BY vehicle_number
  HAVING AVG(total_trips) > 100
)
UPDATE vehicles v
SET actual_rent = 5000
FROM vehicle_avg va
WHERE v.vehicle_number = va.vehicle_number;
```

### Export Vehicle Rent Settings

```sql
-- Get all vehicles with their rent settings
SELECT
  vehicle_number,
  actual_rent,
  CASE
    WHEN actual_rent > 0 THEN 'Fixed Rent'
    ELSE 'Calculated'
  END as rent_type,
  online
FROM vehicles
WHERE online = true
ORDER BY actual_rent DESC;
```

## Troubleshooting

### Issue 1: Rent Not Updating

**Problem**: Set actual_rent but still seeing calculated rent

**Solutions**:

1. Check if column exists:
   ```sql
   SELECT actual_rent FROM vehicles LIMIT 1;
   ```
2. Verify value was set:
   ```sql
   SELECT vehicle_number, actual_rent
   FROM vehicles
   WHERE vehicle_number = 'DL01AB1234';
   ```
3. Refresh VehiclePerformance page
4. Check browser console for errors

### Issue 2: Wrong Rent Amount

**Problem**: Seeing different rent than expected

**Debug Steps**:

1. Open browser console
2. Look for logs: "Using actual rent: ₹X" or "Calculated rent: ₹X"
3. Verify database value:
   ```sql
   SELECT vehicle_number, actual_rent, online
   FROM vehicles
   WHERE vehicle_number = 'YOUR_VEHICLE';
   ```

### Issue 3: Badge Not Showing

**Problem**: Fixed rent set but badge doesn't appear

**Solutions**:

1. Hard refresh page (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Check if `actual_rent > 0`

## Future Enhancements

Potential improvements:

1. **UI for Rent Management**

   - Add rent input field in AdminDrivers
   - Bulk rent update tool
   - Rent history tracking

2. **Time-Based Rent**

   - Set rent with start/end dates
   - Automatic revert to calculated after period
   - Rent change history

3. **Rent Templates**

   - Save common rent configurations
   - Apply templates to multiple vehicles
   - Seasonal rent adjustments

4. **Analytics**

   - Compare calculated vs actual rent
   - ROI analysis per vehicle
   - Optimal rent suggestions

5. **Alerts**
   - Notify when fixed rent period ends
   - Alert if actual rent is significantly different from calculated
   - Performance warnings

## Best Practices

### When to Use Fixed Rent

✅ **Good Use Cases:**

- New vehicles with guaranteed minimum rent
- High-performing vehicles earning above standard
- Special contracts or partnerships
- Promotional periods

❌ **Avoid For:**

- Temporary situations (use transactions instead)
- Frequently changing amounts
- Most standard vehicles (let calculation work)

### Rent Management Tips

1. **Document Agreements**: Keep records of why each vehicle has fixed rent
2. **Regular Review**: Check fixed rents monthly
3. **Revert When Done**: Set to 0 when special period ends
4. **Use Transactions**: For one-time adjustments, use transaction history
5. **Monitor Impact**: Track profit/loss changes after setting fixed rent

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Verify `actual_rent` column exists
- [ ] Set actual rent for test vehicle
- [ ] View vehicle in VehiclePerformance
- [ ] Confirm "Fixed Rent" label appears
- [ ] Verify "Fixed Weekly Rent" badge shows
- [ ] Check profit/loss calculation is correct
- [ ] Export CSV and verify rent data
- [ ] Test with actual_rent = 0 (should calculate)
- [ ] Test with actual_rent > 0 (should use fixed)
- [ ] Check console logs for rent method

## Support

For issues:

1. Check SQL migration ran successfully
2. Verify column in database
3. Check browser console for errors
4. Review Supabase logs
5. Test with sample vehicle first

## Files Modified

1. **ADD_VEHICLE_ACTUAL_RENT.sql** (New)

   - Database migration script

2. **VehiclePerformance.tsx**

   - Added `actual_rent` and `uses_actual_rent` to interface
   - Fetch actual rent from vehicles table
   - Updated rent calculation logic
   - Added visual indicators (badge)
   - Updated rent slab display

3. **VEHICLE_ACTUAL_RENT_IMPLEMENTATION.md** (New)
   - Complete documentation

---

**Version**: 1.0.0  
**Date**: October 23, 2025  
**Last Updated**: October 23, 2025



