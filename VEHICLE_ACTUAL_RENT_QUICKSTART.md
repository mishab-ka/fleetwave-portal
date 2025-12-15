# Vehicle Actual Rent - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run SQL Migration (2 min)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste from `ADD_VEHICLE_ACTUAL_RENT.sql`
4. Click **Run**

```sql
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS actual_rent DECIMAL(10, 2) DEFAULT 0;
```

✅ **Done!** Column is now added.

### Step 2: Set Rent for Your Vehicles (1 min)

Choose your method:

**Option A: Set rent for one vehicle**

```sql
UPDATE vehicles
SET actual_rent = 4200
WHERE vehicle_number = 'DL01AB1234';
```

**Option B: Set same rent for all vehicles**

```sql
UPDATE vehicles
SET actual_rent = 4500
WHERE online = true;
```

### Step 3: View Results (1 min)

1. Open **Admin → Vehicle Performance**
2. You'll see:
   - Rent Slab shows: **"Fixed Rent (₹4,200)"**
   - Blue badge: **"Fixed Weekly Rent"**
3. Profit/Loss now uses your fixed rent! ✨

---

## 📊 How It Works

### Before (Calculated Rent)

```
Vehicle: DL01AB1234
Trips: 95
Rent: ₹740/day × 7 days = ₹5,180/week
```

### After (Fixed Actual Rent)

```
Vehicle: DL01AB1234
Trips: 95  (doesn't matter now!)
Rent: ₹4,200/week  (your fixed amount)
```

---

## 🎯 Common Use Cases

### Use Case 1: New Vehicle Guarantee

```sql
-- New vehicle: Guaranteed ₹4,500/week for 2 months
UPDATE vehicles
SET actual_rent = 4500
WHERE vehicle_number = 'DL01NEW123';
```

### Use Case 2: High Performer Bonus

```sql
-- Top performer: Increase rent to ₹5,500/week
UPDATE vehicles
SET actual_rent = 5500
WHERE vehicle_number = 'DL01TOP100';
```

### Use Case 3: Revert to Calculated

```sql
-- Remove fixed rent, go back to trip-based calculation
UPDATE vehicles
SET actual_rent = 0
WHERE vehicle_number = 'DL01AB1234';
```

---

## 📋 Cheat Sheet

| Action            | SQL Command                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| Set Fixed Rent    | `UPDATE vehicles SET actual_rent = 4200 WHERE vehicle_number = 'XXX';`  |
| Remove Fixed Rent | `UPDATE vehicles SET actual_rent = 0 WHERE vehicle_number = 'XXX';`     |
| View All Rents    | `SELECT vehicle_number, actual_rent FROM vehicles WHERE online = true;` |
| Set All Vehicles  | `UPDATE vehicles SET actual_rent = 4500 WHERE online = true;`           |

---

## ✅ Verification Checklist

After setup, verify:

- [ ] SQL migration ran without errors
- [ ] Can see `actual_rent` column in vehicles table
- [ ] Set test rent for one vehicle
- [ ] Open Vehicle Performance page
- [ ] See "Fixed Rent (₹X)" in Rent Slab column
- [ ] See "Fixed Weekly Rent" blue badge
- [ ] Profit/Loss calculation is correct

---

## 🔍 Quick Debug

**Problem**: Don't see fixed rent

**Check:**

1. Did SQL migration run?

   ```sql
   SELECT actual_rent FROM vehicles LIMIT 1;
   ```

2. Is rent set for vehicle?

   ```sql
   SELECT vehicle_number, actual_rent
   FROM vehicles
   WHERE vehicle_number = 'YOUR_VEHICLE';
   ```

3. Is rent > 0?
   ```sql
   SELECT vehicle_number, actual_rent
   FROM vehicles
   WHERE actual_rent > 0;
   ```

---

## 📱 Visual Guide

### In Vehicle Performance Table:

**Vehicle with Fixed Rent:**

```
┌─────────────┬────────┬─────────────────────────────┐
│ Vehicle     │ Trips  │ Rent Slab                  │
├─────────────┼────────┼─────────────────────────────┤
│ DL01AB1234  │ 95     │ Fixed Rent (₹4,200)        │
│             │        │ [Badge: Fixed Weekly Rent] │
└─────────────┴────────┴────────────────────────────┘
```

**Vehicle with Calculated Rent:**

```
┌─────────────┬────────┬─────────────────────────┐
│ Vehicle     │ Trips  │ Rent Slab              │
├─────────────┼────────┼─────────────────────────┤
│ DL01CD5678  │ 110    │ 110-124 trips (₹560)   │
└─────────────┴────────┴─────────────────────────┘
```

---

## 💡 Pro Tips

1. **Test First**: Try with one vehicle before bulk update
2. **Document Why**: Keep notes on why you set fixed rent
3. **Review Monthly**: Check if fixed rents still make sense
4. **Use Zero to Revert**: Set `actual_rent = 0` to go back to calculated
5. **Monitor Impact**: Watch profit/loss changes after setting rent

---

## 📞 Need Help?

1. Check `VEHICLE_ACTUAL_RENT_IMPLEMENTATION.md` for detailed docs
2. Use `MANAGE_VEHICLE_ACTUAL_RENT.sql` for more SQL examples
3. Check browser console for rent calculation logs

---

**Ready to go!** 🎉

Your vehicles can now have fixed weekly rents that override trip-based calculations.



