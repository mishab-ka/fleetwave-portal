# Vehicle Actual Rent Feature - README

## 🎯 What This Does

Allows you to set a **fixed weekly rent** for vehicles instead of calculating rent based on trips.

## 🚀 Setup (3 Steps)

### 1. Run SQL (Copy-Paste in Supabase)

```sql
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS actual_rent DECIMAL(10, 2) DEFAULT 0;
```

### 2. Set Rent for Vehicle

```sql
UPDATE vehicles
SET actual_rent = 4200
WHERE vehicle_number = 'DL01AB1234';
```

### 3. Done!

Open **Admin → Vehicle Performance** to see results.

---

## 📊 How It Looks

### In Vehicle Performance Table:

**With Fixed Rent:**

```
Vehicle: DL01AB1234
Rent Slab: Fixed Rent (₹4,200)
[Blue Badge: Fixed Weekly Rent]
```

**Without Fixed Rent (Normal):**

```
Vehicle: DL01CD5678
Rent Slab: 110-124 trips (₹560)
```

---

## 💡 Common Commands

```sql
-- Set fixed rent
UPDATE vehicles SET actual_rent = 4500 WHERE vehicle_number = 'DL01AB1234';

-- Remove fixed rent (back to calculated)
UPDATE vehicles SET actual_rent = 0 WHERE vehicle_number = 'DL01AB1234';

-- View all vehicles with fixed rent
SELECT vehicle_number, actual_rent FROM vehicles WHERE actual_rent > 0;

-- Set same rent for all
UPDATE vehicles SET actual_rent = 4200 WHERE online = true;
```

---

## 📁 Documentation Files

- **Quick Start**: `VEHICLE_ACTUAL_RENT_QUICKSTART.md` (5 min read)
- **Full Details**: `VEHICLE_ACTUAL_RENT_IMPLEMENTATION.md` (complete guide)
- **SQL Helpers**: `MANAGE_VEHICLE_ACTUAL_RENT.sql` (all SQL queries)
- **Summary**: `IMPLEMENTATION_SUMMARY_ACTUAL_RENT.md` (what was done)

---

## ✅ Works!

- ✅ Fetches actual rent from database
- ✅ Uses fixed rent in profit/loss calculation
- ✅ Shows visual indicator (badge)
- ✅ Falls back to calculated rent if not set
- ✅ Works for all tabs in Vehicle Performance

---

## 🔍 Debug

**Not seeing fixed rent?**

1. Check column exists: `SELECT actual_rent FROM vehicles LIMIT 1;`
2. Check value is set: `SELECT actual_rent FROM vehicles WHERE vehicle_number = 'XXX';`
3. Refresh page
4. Check browser console for logs

---

**That's it!** Simple and powerful. 🎉



