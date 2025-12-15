# Online Drivers API - Troubleshooting

## 🔍 Issue: "Success. No rows returned"

This means the function is working correctly, but there are no drivers with `online = true` in your database.

---

## ✅ Verification Steps

### Step 1: Check if you have any drivers

Run this in Supabase SQL Editor:

```sql
-- Count total drivers
SELECT COUNT(*) as total_drivers
FROM users
WHERE role = 'driver';
```

**Expected:** Should return a number > 0

**If 0:** You don't have any drivers in the database yet.

---

### Step 2: Check online status of drivers

Run this in Supabase SQL Editor:

```sql
-- Check all drivers and their online status
SELECT
  id,
  name,
  phone_number,
  driver_id,
  shift,
  online,
  role
FROM users
WHERE role = 'driver'
ORDER BY name;
```

**Check:**

- Do you see drivers listed?
- What is the `online` column value? (true/false/null)

---

### Step 3: Check how many are online

Run this in Supabase SQL Editor:

```sql
-- Count online vs offline drivers
SELECT
  online,
  COUNT(*) as count
FROM users
WHERE role = 'driver'
GROUP BY online;
```

**Expected Output:**

```
online | count
-------|------
true   | X
false  | Y
null   | Z
```

**If all are `false` or `null`:** No drivers are currently online.

---

### Step 4: Check specific driver

Run this (replace with actual driver ID):

```sql
-- Check a specific driver
SELECT
  id,
  name,
  phone_number,
  online,
  role
FROM users
WHERE role = 'driver'
LIMIT 5;
```

---

## 🔧 Solutions

### Solution 1: Set a driver to online (for testing)

If you want to test the API, you can manually set a driver to online:

```sql
-- Set a specific driver to online (replace USER_ID)
UPDATE users
SET online = true
WHERE id = 'USER_ID_HERE' AND role = 'driver';

-- Or set all drivers to online (for testing)
UPDATE users
SET online = true
WHERE role = 'driver';
```

**⚠️ Warning:** Only use the second query for testing. Don't set all drivers to online in production.

---

### Solution 2: Check how drivers go online

Drivers should be set to `online = true` when:

- They log into the mobile app
- Admin manually sets them online
- System automatically sets them online

**Check your application code** to see how the `online` status is updated.

---

### Solution 3: Get all drivers (regardless of online status)

If you want to get all drivers (not just online), modify the function or create a new one:

```sql
-- Get ALL drivers (not just online)
CREATE OR REPLACE FUNCTION get_all_drivers()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  phone_number TEXT,
  shift TEXT,
  online BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id::UUID as user_id,
    COALESCE(u.name, '')::TEXT as name,
    COALESCE(u.phone_number, '')::TEXT as phone_number,
    COALESCE(u.shift, 'morning')::TEXT as shift,
    u.online::BOOLEAN
  FROM users u
  WHERE u.role = 'driver'
  ORDER BY u.name ASC;
END;
$$;
```

---

## 🧪 Test Queries

### Test 1: Verify function works

```sql
-- This should return empty array if no drivers are online
SELECT * FROM get_online_drivers();
```

### Test 2: Check if function exists

```sql
-- Verify function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'get_online_drivers';
```

### Test 3: Manual check

```sql
-- Manually check what the function would return
SELECT
  u.id,
  u.name,
  u.phone_number,
  u.shift,
  u.online
FROM users u
WHERE u.role = 'driver' AND u.online = true;
```

---

## 📊 Common Scenarios

### Scenario 1: No drivers in database

**Problem:** `SELECT COUNT(*) FROM users WHERE role = 'driver'` returns 0

**Solution:**

- Create driver accounts first
- Or check if drivers are stored in a different table

### Scenario 2: All drivers are offline

**Problem:** Drivers exist but `online = false` or `online = null`

**Solution:**

- Check how your app sets drivers online
- Manually set one to online for testing: `UPDATE users SET online = true WHERE id = '...'`

### Scenario 3: Drivers exist but role is wrong

**Problem:** Drivers have different role value

**Solution:**

- Check actual role values: `SELECT DISTINCT role FROM users;`
- Update function if needed: Change `u.role = 'driver'` to match your actual role value

---

## 🔍 Debugging Checklist

- [ ] Function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_online_drivers';`
- [ ] Drivers exist: `SELECT COUNT(*) FROM users WHERE role = 'driver';`
- [ ] Some drivers are online: `SELECT COUNT(*) FROM users WHERE role = 'driver' AND online = true;`
- [ ] Role value is correct: `SELECT DISTINCT role FROM users;`
- [ ] Online column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'online';`

---

## 💡 Quick Fix for Testing

If you just want to test the API and see it working:

```sql
-- Set first 5 drivers to online (for testing)
UPDATE users
SET online = true
WHERE id IN (
  SELECT id
  FROM users
  WHERE role = 'driver'
  LIMIT 5
);

-- Now test the function
SELECT * FROM get_online_drivers();
```

---

## 📝 Notes

- **"No rows returned" is NOT an error** - it means the function works but no data matches
- The function only returns drivers where `online = true`
- If you need all drivers, use `get_all_drivers()` function (create it using Solution 3 above)
- Check your application code to see how drivers are set to online

---

**Next Steps:**

1. Run the verification queries above
2. Check if any drivers have `online = true`
3. If not, check how your app sets drivers online
4. For testing, manually set a driver to online
