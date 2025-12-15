# Online Drivers API - Debug Guide

## 🔍 Issue: Nothing is returned

If `get_online_drivers()` returns no results, follow these steps:

---

## Step 1: Check ALL Drivers (Not Just Online)

Run this to see what drivers you have:

```sql
SELECT * FROM get_all_drivers();
```

**This will show:**
- All drivers in your database
- Their online status
- Their phone numbers
- Their shifts

**If this also returns nothing:** You don't have any drivers with `role = 'driver'` in your database.

---

## Step 2: Check Raw Data

Run these diagnostic queries:

### Query 1: Count total drivers
```sql
SELECT COUNT(*) as total_drivers
FROM users
WHERE role = 'driver';
```

### Query 2: See all drivers with their online status
```sql
SELECT 
  id,
  name,
  phone_number,
  shift,
  online,
  role
FROM users
WHERE role = 'driver'
ORDER BY name;
```

### Query 3: Check online status distribution
```sql
SELECT 
  COALESCE(online::TEXT, 'NULL') as online_status,
  COUNT(*) as count
FROM users
WHERE role = 'driver'
GROUP BY online;
```

---

## Step 3: Check Role Value

The function looks for `role = 'driver'`. Check what role values you actually have:

```sql
SELECT DISTINCT role, COUNT(*) 
FROM users 
GROUP BY role;
```

**If your drivers have a different role value** (like `'Driver'` with capital D, or `'drivers'` plural), update the function or use the correct role.

---

## Step 4: Quick Fix - Set Drivers to Online

If you have drivers but they're all offline, set them to online for testing:

### Option A: Set all drivers to online
```sql
UPDATE users
SET online = true
WHERE role = 'driver';
```

### Option B: Set specific drivers to online
```sql
-- Set first 5 drivers to online
UPDATE users
SET online = true
WHERE id IN (
  SELECT id 
  FROM users 
  WHERE role = 'driver' 
  LIMIT 5
);
```

### Option C: Set by name
```sql
UPDATE users
SET online = true
WHERE role = 'driver' 
AND name = 'Driver Name Here';
```

---

## Step 5: Test Again

After setting drivers to online, test:

```sql
SELECT * FROM get_online_drivers();
```

---

## Alternative: Use get_all_drivers() in n8n

If you want to send messages to ALL drivers (not just online), use:

**URL:** `https://upnhxshwzpbcfmumclwz.supabase.co/rest/v1/rpc/get_all_drivers`

**Body:** `{}`

Then filter in n8n by `online === true` if needed.

---

## Common Issues

### Issue 1: No drivers in database
**Solution:** Create driver accounts first

### Issue 2: Role is different
**Check:** `SELECT DISTINCT role FROM users;`
**Solution:** Update function to use correct role value

### Issue 3: Online column is NULL
**Check:** `SELECT online FROM users WHERE role = 'driver' LIMIT 1;`
**Solution:** Update NULL to false: `UPDATE users SET online = false WHERE online IS NULL AND role = 'driver';`

### Issue 4: Online column doesn't exist
**Check:** `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'online';`
**Solution:** Add column: `ALTER TABLE users ADD COLUMN IF NOT EXISTS online BOOLEAN DEFAULT false;`

---

## Quick Test Script

Run this complete diagnostic:

```sql
-- 1. Check if online column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'online';

-- 2. Check total drivers
SELECT COUNT(*) as total_drivers FROM users WHERE role = 'driver';

-- 3. Check online status
SELECT online, COUNT(*) 
FROM users 
WHERE role = 'driver' 
GROUP BY online;

-- 4. See sample drivers
SELECT name, phone_number, shift, online 
FROM users 
WHERE role = 'driver' 
LIMIT 10;

-- 5. Test get_all_drivers function
SELECT * FROM get_all_drivers() LIMIT 5;

-- 6. Test get_online_drivers function
SELECT * FROM get_online_drivers();
```

---

## Next Steps

1. **Run `get_all_drivers()`** to see what data you have
2. **Check the diagnostic queries** above
3. **Set some drivers to online** for testing
4. **Test the function again**

If you still get no results after setting drivers to online, there might be a different issue. Share the results of the diagnostic queries and I can help further.

