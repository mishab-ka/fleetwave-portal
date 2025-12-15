# ⚡ Quick Setup: Room & Bed Naming Update

## 🎯 **Goal**

Change room and bed names to:

- **Rooms:** Room A, Room B, Room C, Room D, Room E, Room F
- **Beds:** Bed 1, Bed 2, Bed 3, Bed 4, Bed 5

---

## 🚀 **2-Minute Setup**

### **Step 1: Run SQL Script** (1 minute)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste **ONE** of these scripts:

---

#### **Option A: Update Existing Data**

Use this if you already have rooms and beds in your database.

```sql
-- Update room names to alphabets
UPDATE rooms
SET room_name = 'Room ' || CHR(64 + room_number)
WHERE room_number <= 26;

-- Update bed names to numbers
UPDATE beds
SET bed_name = 'Bed ' || bed_number::TEXT;
```

4. Click "Run" ✅

---

#### **Option B: Fresh Install** (Recommended)

Use this for new setup or to ensure consistency.

```sql
-- Create/update rooms with alphabet names
INSERT INTO rooms (room_number, room_name, total_beds, status) VALUES
(1, 'Room A', 5, 'online'),
(2, 'Room B', 5, 'online'),
(3, 'Room C', 5, 'online'),
(4, 'Room D', 5, 'online'),
(5, 'Room E', 5, 'online'),
(6, 'Room F', 5, 'online')
ON CONFLICT (room_number)
DO UPDATE SET room_name = EXCLUDED.room_name;

-- Create/update beds with number names
DO $$
DECLARE
    room_record RECORD;
    bed_num INTEGER;
BEGIN
    FOR room_record IN SELECT id FROM rooms ORDER BY room_number LOOP
        FOR bed_num IN 1..5 LOOP
            INSERT INTO beds (room_id, bed_number, bed_name, daily_rent)
            VALUES (
                room_record.id,
                bed_num,
                'Bed ' || bed_num::TEXT,
                100.00
            )
            ON CONFLICT (room_id, bed_number)
            DO UPDATE SET bed_name = EXCLUDED.bed_name;
        END LOOP;
    END LOOP;
END $$;
```

4. Click "Run" ✅

---

### **Step 2: Verify** (30 seconds)

Run this to check:

```sql
SELECT
  r.room_name AS "Room",
  b.bed_name AS "Bed"
FROM rooms r
JOIN beds b ON b.room_id = r.id
ORDER BY r.room_number, b.bed_number
LIMIT 10;
```

**Expected Output:**

```
Room    | Bed
--------|-------
Room A  | Bed 1
Room A  | Bed 2
Room A  | Bed 3
Room A  | Bed 4
Room A  | Bed 5
Room B  | Bed 1
Room B  | Bed 2
...
```

---

### **Step 3: Check UI** (30 seconds)

1. Login as admin
2. Go to Drivers page
3. Click on any driver
4. Go to "Accommodation" tab
5. Check naming:
   - Room names should be: Room A, Room B, etc.
   - Bed names should be: Bed 1, Bed 2, etc.

---

## ✅ **That's It!**

Your rooms and beds now use the new naming convention!

---

## 🎨 **What You'll See**

### **In UI:**

**Before:**

```
Room 1, Bed A
Room 2, Bed B
Room 3, Bed C
```

**After:**

```
Room A, Bed 1 ✅
Room B, Bed 2 ✅
Room C, Bed 3 ✅
```

---

### **In Dropdowns:**

**Before:**

```
Room 1 - Bed A (Available)
Room 1 - Bed B (Occupied)
Room 2 - Bed A (Available)
```

**After:**

```
Room A - Bed 1 (Available)
Room A - Bed 2 (Occupied)
Room B - Bed 1 (Available)
```

---

## 🐛 **Troubleshooting**

### **Issue: Room names not updating**

**Solution:**

```sql
-- Force update all rooms
UPDATE rooms
SET room_name = 'Room ' || CHR(64 + room_number);
```

---

### **Issue: Bed names not updating**

**Solution:**

```sql
-- Force update all beds
UPDATE beds
SET bed_name = 'Bed ' || bed_number::TEXT;
```

---

### **Issue: UI still shows old names**

**Solution:**

1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Re-login to app

---

## 📊 **Quick Reference**

### **Room Naming:**

```
room_number → room_name
     1      → Room A
     2      → Room B
     3      → Room C
     4      → Room D
     5      → Room E
     6      → Room F
```

### **Bed Naming:**

```
bed_number → bed_name
    1      → Bed 1
    2      → Bed 2
    3      → Bed 3
    4      → Bed 4
    5      → Bed 5
```

---

## 🎯 **Complete Structure**

```
Room A → Beds 1, 2, 3, 4, 5
Room B → Beds 1, 2, 3, 4, 5
Room C → Beds 1, 2, 3, 4, 5
Room D → Beds 1, 2, 3, 4, 5
Room E → Beds 1, 2, 3, 4, 5
Room F → Beds 1, 2, 3, 4, 5

Total: 30 beds
Capacity: 60 drivers (2 per bed with shifts)
```

---

**Status:** ✅ **READY TO USE!**

The new naming convention is now active! 🎉

