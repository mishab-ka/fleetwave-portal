# Fleet Rent Debugging Guide

## Issue: Fleet Rent showing ₹0

The Fleet Rent is calculated as: **Daily Rent (based on trips) × Rent Slab (days)**

If Fleet Rent is showing ₹0, check these steps:

---

## Step 1: Check if Database Migration is Applied

Run this SQL query in Supabase SQL Editor:

```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
AND column_name IN ('rent_start_from', 'current_rent_slab', 'rent_slab_last_updated');
```

**Expected Result:** Should return 3 rows showing the columns exist.

**If no rows:** You need to run the migration file first!

---

## Step 2: Apply the Migration

If the columns don't exist, run this in Supabase SQL Editor:

```bash
# Copy the entire content of this file and run it:
supabase/migrations/20260130000000_add_vehicle_rent_tracking.sql
```

Or use Supabase CLI:
```bash
cd /Users/mishabka/Tawaaq/fleetwave-portal
supabase db push
```

---

## Step 3: Check Vehicle Rent Slab Values

Run this query to see the current rent slab for all vehicles:

```sql
SELECT 
  vehicle_number,
  online,
  rent_start_from,
  current_rent_slab,
  rent_slab_last_updated
FROM vehicles
WHERE online = true
ORDER BY vehicle_number;
```

**What to look for:**
- `rent_start_from` should have a date (e.g., '2026-01-29')
- `current_rent_slab` should be 0-7 (days in current week)
- If `rent_start_from` is NULL, the rent slab will be 0

---

## Step 4: Activate Vehicles with Rent Start Date

If vehicles have `rent_start_from = NULL`:

1. Go to Admin → Vehicles page
2. Click the status badge to activate a vehicle
3. A dialog will appear asking for "Rent Start Date"
4. Select the date (e.g., today or when the vehicle started)
5. Click "Activate Vehicle"

The system will automatically calculate `current_rent_slab` based on:
- How many days from rent_start_from to today
- Only counting days in the current week (Monday-Sunday)

---

## Step 5: Test the Calculation Manually

Run this to test the calculation function:

```sql
-- Test for a specific vehicle (replace 'KA01AB1234' with your vehicle number)
SELECT calculate_vehicle_rent_slab('KA01AB1234', CURRENT_DATE);
```

**Example Results:**
- If activated Wednesday, today is Friday → Returns **3** (Wed, Thu, Fri)
- If activated last week, today is Wednesday → Returns **3** (Mon, Tue, Wed)
- If activated yesterday, today is Monday → Returns **1** (just Monday)

---

## Step 6: Check Browser Console Logs

Open VehiclePerformance page and check browser console for these logs:

```
Loaded rent slabs for X vehicles from database: [...]
Vehicle KA01AB1234: current_rent_slab = 3 days
Initializing KA01AB1234 - Rent Slab from DB: 3, exact_working_days: 3
KA01AB1234 - Fleet Rent Calculation: {
  total_trips: 25,
  dailyRent: 400,
  exactWorkingDays: 3,
  totalRent: 1200,
  formula: "₹400 (daily rent) × 3 (rent slab days) = ₹1200"
}
```

---

## Expected Behavior After Fix

### Scenario 1: Vehicle activated Wednesday (3 days ago)
- **Current Week:** Jan 26 (Mon) - Feb 1 (Sun)
- **Rent Start:** Jan 29 (Wed)
- **Today:** Jan 31 (Fri)
- **Rent Slab:** 3 days (Wed, Thu, Fri)
- **Daily Rent:** ₹400 (example, based on trips)
- **Fleet Rent:** ₹400 × 3 = **₹1,200**

### Scenario 2: New week just started (Monday)
- **Rent Slab:** 0 or 1 days (depending on time)
- **Fleet Rent:** ₹400 × 0 = **₹0** (correct, as no rental days yet this week)

### Scenario 3: Vehicle has no rent_start_from
- **Rent Slab:** 0 days
- **Fleet Rent:** ₹400 × 0 = **₹0** (you need to set rent_start_from first!)

---

## Common Issues & Solutions

### Issue: "Function calculate_vehicle_rent_slab does not exist"
**Solution:** Migration not applied. Run Step 2.

### Issue: Rent Slab shows 0 for all vehicles
**Possible Causes:**
1. `rent_start_from` is not set → Activate vehicles with rent start date
2. It's Monday and week just reset → This is correct behavior
3. Trigger not firing → Check if trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_update_vehicle_rent_slab';
   ```

### Issue: Rent Slab shows wrong number
**Check:**
1. Is the vehicle actually online? (online = true)
2. What is the rent_start_from date?
3. Run the calculation function manually (Step 5) to verify

---

## Force Recalculation for All Vehicles

If you need to manually trigger recalculation:

```sql
-- Update all active vehicles' rent slab
SELECT update_all_active_vehicle_rent_slabs();
```

Or update a specific vehicle:

```sql
UPDATE vehicles 
SET rent_slab_last_updated = NOW() 
WHERE vehicle_number = 'KA01AB1234';
-- The trigger will automatically recalculate current_rent_slab
```

---

## Need to Set Rent Start Date for Existing Active Vehicles?

If you have vehicles that are already active but don't have `rent_start_from`:

```sql
-- Set rent_start_from to today for all active vehicles without it
UPDATE vehicles
SET rent_start_from = NOW()
WHERE online = true AND rent_start_from IS NULL;

-- The trigger will automatically calculate current_rent_slab
```

Or set specific dates:

```sql
-- Set rent start date to Jan 20, 2026 for a specific vehicle
UPDATE vehicles
SET rent_start_from = '2026-01-20 00:00:00+00'
WHERE vehicle_number = 'KA01AB1234';
```

---

## Contact for Support

If issues persist after following all steps, check:
1. Browser console logs (Step 6)
2. Supabase logs (Database → Logs)
3. Verify migration SQL syntax is correct
