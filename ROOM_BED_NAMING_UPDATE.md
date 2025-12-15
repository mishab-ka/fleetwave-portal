# 🏠 Room & Bed Naming Convention Update

## ✅ **IMPLEMENTATION COMPLETE**

Updated the room and bed naming system to use:

- **Rooms:** Alphabets (Room A, Room B, Room C, etc.)
- **Beds:** Numbers (Bed 1, Bed 2, Bed 3, etc.)

---

## 🎯 **New Naming Convention**

### **BEFORE:**

```
Room 1
├─ Bed A
├─ Bed B
├─ Bed C
├─ Bed D
└─ Bed E

Room 2
├─ Bed A
├─ Bed B
├─ Bed C
├─ Bed D
└─ Bed E
```

**Issues:**

- Room numbers confusing with bed numbers
- Bed letters can be confused with room letters (future)

---

### **AFTER:**

```
Room A
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5

Room B
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5
```

**Benefits:**

- ✅ Clear distinction: Letters = Rooms, Numbers = Beds
- ✅ Easier to communicate: "Room A, Bed 3"
- ✅ More intuitive for users
- ✅ Professional naming scheme

---

## 📊 **Complete Room & Bed Structure**

### **All 6 Rooms:**

```
Room A (5 beds)
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5

Room B (5 beds)
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5

Room C (5 beds)
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5

Room D (5 beds)
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5

Room E (5 beds)
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5

Room F (5 beds)
├─ Bed 1
├─ Bed 2
├─ Bed 3
├─ Bed 4
└─ Bed 5

Total: 6 Rooms × 5 Beds = 30 Beds
Total Capacity: 60 Drivers (2 per bed with 12hr shifts)
```

---

## 🔧 **SQL Implementation**

### **Script 1: Update Existing Data**

**File:** `UPDATE_ROOM_BED_NAMING.sql`

#### **Update Room Names:**

```sql
-- Convert room_number to alphabet
-- 1 → A, 2 → B, 3 → C, etc.

UPDATE rooms
SET room_name = 'Room ' || CHR(64 + room_number)
WHERE room_number <= 26; -- A-Z
```

**Formula:**

- `CHR(64 + 1)` = CHR(65) = 'A'
- `CHR(64 + 2)` = CHR(66) = 'B'
- `CHR(64 + 3)` = CHR(67) = 'C'

**Result:**

- Room 1 → Room A
- Room 2 → Room B
- Room 3 → Room C
- Room 4 → Room D
- Room 5 → Room E
- Room 6 → Room F

---

#### **Update Bed Names:**

```sql
-- Convert bed identifier to number
UPDATE beds
SET bed_name = 'Bed ' || bed_number::TEXT;
```

**Result:**

- Bed A → Bed 1 (bed_number = 1)
- Bed B → Bed 2 (bed_number = 2)
- Bed C → Bed 3 (bed_number = 3)
- Bed D → Bed 4 (bed_number = 4)
- Bed E → Bed 5 (bed_number = 5)

---

### **Script 2: Create New Rooms/Beds**

**File:** `CREATE_ROOMS_BEDS_NEW_NAMING.sql`

#### **Insert Rooms:**

```sql
INSERT INTO rooms (room_number, room_name, total_beds, status) VALUES
(1, 'Room A', 5, 'online'),
(2, 'Room B', 5, 'online'),
(3, 'Room C', 5, 'online'),
(4, 'Room D', 5, 'online'),
(5, 'Room E', 5, 'online'),
(6, 'Room F', 5, 'online')
ON CONFLICT (room_number)
DO UPDATE SET room_name = EXCLUDED.room_name;
```

---

#### **Insert Beds:**

```sql
DO $$
DECLARE
    room_record RECORD;
    bed_num INTEGER;
BEGIN
    FOR room_record IN SELECT id, room_number FROM rooms LOOP
        FOR bed_num IN 1..5 LOOP
            INSERT INTO beds (room_id, bed_number, bed_name, daily_rent)
            VALUES (
                room_record.id,
                bed_num,
                'Bed ' || bed_num::TEXT, -- Bed 1, Bed 2, etc.
                100.00
            )
            ON CONFLICT (room_id, bed_number)
            DO UPDATE SET bed_name = EXCLUDED.bed_name;
        END LOOP;
    END LOOP;
END $$;
```

---

## 🎨 **UI Display Examples**

### **Example 1: Driver Assignment**

**OLD:**

```
Driver: John Doe
Assigned to: Room 1, Bed A, Morning Shift
```

**NEW:**

```
Driver: John Doe
Assigned to: Room A, Bed 1, Morning Shift
```

---

### **Example 2: Accommodation Card**

**OLD:**

```
┌────────────────────────┐
│ 🏠 Room: Room 1        │
│ 🛏️  Bed: Bed A         │
│ ⏰ Shift: Morning       │
└────────────────────────┘
```

**NEW:**

```
┌────────────────────────┐
│ 🏠 Room: Room A        │
│ 🛏️  Bed: Bed 1         │
│ ⏰ Shift: Morning       │
└────────────────────────┘
```

---

### **Example 3: Bed Selection Dropdown**

**OLD:**

```
Room 1 - Bed A (Available)
Room 1 - Bed B (Partially Occupied)
Room 2 - Bed A (Available)
```

**NEW:**

```
Room A - Bed 1 (Available)
Room A - Bed 2 (Partially Occupied)
Room B - Bed 1 (Available)
```

---

## 📋 **Naming Rules**

### **Room Names:**

**Pattern:** `Room [LETTER]`

**Examples:**

- 1st room → Room A
- 2nd room → Room B
- 6th room → Room F
- 26th room → Room Z
- 27th room → Room AA (if needed)

**Database:**

- `room_number`: Integer (1, 2, 3, ...)
- `room_name`: VARCHAR ('Room A', 'Room B', ...)

---

### **Bed Names:**

**Pattern:** `Bed [NUMBER]`

**Examples:**

- 1st bed → Bed 1
- 2nd bed → Bed 2
- 5th bed → Bed 5

**Database:**

- `bed_number`: Integer (1, 2, 3, 4, 5)
- `bed_name`: VARCHAR ('Bed 1', 'Bed 2', ...)

---

## 🔄 **Conversion Formula**

### **Room Number to Letter:**

```sql
-- For rooms 1-26
CHR(64 + room_number)

Examples:
CHR(64 + 1) = CHR(65) = 'A'
CHR(64 + 2) = CHR(66) = 'B'
CHR(64 + 6) = CHR(70) = 'F'
```

### **Bed Number to Text:**

```sql
-- Simple integer to text conversion
bed_number::TEXT

Examples:
1::TEXT = '1'
2::TEXT = '2'
5::TEXT = '5'
```

---

## 🧪 **Testing & Verification**

### **Test 1: Check Room Names**

```sql
SELECT room_number, room_name
FROM rooms
ORDER BY room_number;
```

**Expected Result:**

```
room_number | room_name
------------|----------
     1      | Room A
     2      | Room B
     3      | Room C
     4      | Room D
     5      | Room E
     6      | Room F
```

---

### **Test 2: Check Bed Names**

```sql
SELECT
  r.room_name,
  b.bed_number,
  b.bed_name
FROM beds b
JOIN rooms r ON r.id = b.room_id
WHERE r.room_number = 1
ORDER BY b.bed_number;
```

**Expected Result:**

```
room_name | bed_number | bed_name
----------|------------|----------
Room A    |     1      | Bed 1
Room A    |     2      | Bed 2
Room A    |     3      | Bed 3
Room A    |     4      | Bed 4
Room A    |     5      | Bed 5
```

---

### **Test 3: Complete Overview**

```sql
SELECT
  r.room_name AS "Room",
  b.bed_name AS "Bed",
  CONCAT(r.room_name, ', ', b.bed_name) AS "Full Address"
FROM rooms r
JOIN beds b ON b.room_id = r.id
ORDER BY r.room_number, b.bed_number
LIMIT 10;
```

**Expected Result:**

```
Room    | Bed    | Full Address
--------|--------|---------------
Room A  | Bed 1  | Room A, Bed 1
Room A  | Bed 2  | Room A, Bed 2
Room A  | Bed 3  | Room A, Bed 3
Room A  | Bed 4  | Room A, Bed 4
Room A  | Bed 5  | Room A, Bed 5
Room B  | Bed 1  | Room B, Bed 1
Room B  | Bed 2  | Room B, Bed 2
...
```

---

## 📁 **Files Created**

### **1. UPDATE_ROOM_BED_NAMING.sql**

**Purpose:** Update existing rooms and beds  
**Actions:**

- Updates `room_name` column to use alphabets
- Updates `bed_name` column to use numbers
- Adds documentation comments
- Includes verification query

**When to Use:** If you already have rooms and beds with old naming

---

### **2. CREATE_ROOMS_BEDS_NEW_NAMING.sql**

**Purpose:** Create or update rooms and beds with new naming  
**Actions:**

- Inserts/updates 6 rooms (A-F)
- Inserts/updates 30 beds (5 per room, numbered 1-5)
- Uses `ON CONFLICT` to handle existing data
- Includes verification queries

**When to Use:**

- Setting up for the first time
- Want to ensure all rooms/beds follow new convention

---

## 🎯 **Impact on UI**

### **Where Names Appear:**

1. ✅ **Driver Profile**

   - Accommodation tab
   - Shows: "Room A, Bed 1"

2. ✅ **Admin Driver Details**

   - Accommodation section
   - Shows: "Room A, Bed 1, Morning Shift"

3. ✅ **Room & Bed Management**

   - Room cards
   - Bed assignments
   - Shows: "Room A" with "Bed 1, Bed 2, ..." inside

4. ✅ **Accommodation Assignment**

   - Dropdown selections
   - Shows: "Room A - Bed 1 (Available)"

5. ✅ **Monthly Rent Dashboard**
   - Rent reports
   - Shows: Driver assigned to "Room A, Bed 1"

---

## 💡 **Communication Benefits**

### **Clearer Instructions:**

**OLD:**

```
Admin: "Assign the driver to Room 1, Bed B"
Driver: "Which one? Bed 1 or Bed B?"
❌ Confusion between numbers and letters
```

**NEW:**

```
Admin: "Assign the driver to Room A, Bed 2"
Driver: "Got it! Room A (letter), Bed 2 (number)"
✅ Clear distinction
```

---

### **Easier Reference:**

**OLD:**

```
"The driver in Room 2, Bed C"
"Wait, is that Room 2 or Bed 2?"
```

**NEW:**

```
"The driver in Room B, Bed 3"
"Clear! Room B (letter), Bed 3 (number)"
```

---

## 🎨 **Visual Examples**

### **Dropdown Selection:**

```
Choose a bed:
▼
Room A - Bed 1 (Available)
Room A - Bed 2 (Partially Occupied)
Room A - Bed 3 (Available)
Room A - Bed 4 (Fully Occupied)
Room A - Bed 5 (Available)
Room B - Bed 1 (Available)
Room B - Bed 2 (Available)
...
```

---

### **Current Assignment Display:**

```
┌───────────────────────────────┐
│ ✅ Current Assignment         │
├───────────────────────────────┤
│ 🏠 Room: Room A               │
│ 🛏️  Bed: Bed 1                │
│ 👤 Shift: Morning Shift       │
│ 📅 Since: Oct 12, 2025        │
└───────────────────────────────┘
```

---

### **Bed Occupancy Status:**

```
Room A:
├─ Bed 1: Morning (John) | Night (Available)
├─ Bed 2: Morning (Available) | Night (Jane)
├─ Bed 3: Morning (Mike) | Night (Sarah)
├─ Bed 4: Morning (Available) | Night (Available)
└─ Bed 5: Morning (Tom) | Night (Lisa)
```

---

## 📋 **Setup Instructions**

### **Option 1: Update Existing Data**

**If you already have rooms and beds with old naming:**

1. Open Supabase SQL Editor
2. Run the script:
   ```
   /Users/mishabka/Tawaaq/fleetwave-portal/supabase/UPDATE_ROOM_BED_NAMING.sql
   ```
3. Verify results (script includes verification queries)

**What it does:**

- Updates all existing `room_name` values to use letters
- Updates all existing `bed_name` values to use numbers
- Doesn't affect `room_number` or `bed_number` (keeps as integers)
- Only changes display names

---

### **Option 2: Create Fresh (Recommended)**

**If setting up for the first time or want to ensure consistency:**

1. Open Supabase SQL Editor
2. Run the script:
   ```
   /Users/mishabka/Tawaaq/fleetwave-portal/supabase/CREATE_ROOMS_BEDS_NEW_NAMING.sql
   ```
3. Check verification queries at the end

**What it does:**

- Creates or updates 6 rooms (A-F)
- Creates or updates 30 beds (5 per room, numbered 1-5)
- Uses `ON CONFLICT` to update existing records
- Safe to run multiple times

---

## 🎯 **Database Schema**

### **Rooms Table:**

| Column        | Type    | Example Value | Notes                            |
| ------------- | ------- | ------------- | -------------------------------- |
| `id`          | UUID    | `uuid-here`   | Primary key                      |
| `room_number` | INTEGER | `1`           | Numeric identifier (for sorting) |
| `room_name`   | VARCHAR | `'Room A'`    | Display name (alphabets)         |
| `total_beds`  | INTEGER | `5`           | Number of beds                   |
| `status`      | VARCHAR | `'online'`    | Room status                      |

**Key Point:**

- `room_number` stays as integer (for sorting/queries)
- `room_name` uses alphabets (for display)

---

### **Beds Table:**

| Column       | Type    | Example Value | Notes                            |
| ------------ | ------- | ------------- | -------------------------------- |
| `id`         | UUID    | `uuid-here`   | Primary key                      |
| `room_id`    | UUID    | `room-uuid`   | Foreign key to rooms             |
| `bed_number` | INTEGER | `1`           | Numeric identifier (for sorting) |
| `bed_name`   | VARCHAR | `'Bed 1'`     | Display name (numbers)           |
| `daily_rent` | DECIMAL | `100.00`      | ₹100 per day                     |
| `status`     | VARCHAR | `'available'` | Bed status                       |

**Key Point:**

- `bed_number` stays as integer (for sorting/queries)
- `bed_name` uses numbers (for display)

---

## 🔄 **Backwards Compatibility**

### **Queries Still Work:**

**Sorting by number:**

```sql
ORDER BY room_number, bed_number
```

Still works because these columns remain integers!

**Display:**

```sql
SELECT room_name, bed_name
```

Now returns "Room A", "Bed 1" instead of "Room 1", "Bed A"

---

### **No Breaking Changes:**

- ✅ All foreign keys intact
- ✅ All relationships preserved
- ✅ All indexes work
- ✅ Sorting logic unchanged
- ✅ Only display names changed

---

## 🎨 **UI Impact**

### **Accommodation Assignment Component:**

**Dropdowns will show:**

```
Select Room:
- Room A 🟢
- Room B 🟢
- Room C 🟢
...

Select Bed:
- Room A - Bed 1 (Available)
- Room A - Bed 2 (Partially Occupied)
- Room A - Bed 3 (Available)
...
```

---

### **Driver Profile:**

**Current Assignment:**

```
┌──────────────────────┐
│ Room: Room A         │
│ Bed: Bed 1           │
│ Shift: Morning       │
└──────────────────────┘
```

---

### **Admin Driver Details:**

**Accommodation Info:**

```
🏠 Room: Room A
🛏️  Bed Space: Bed 1
⏰ Shift: Morning
```

---

## 📊 **Example Data**

### **Sample Assignment:**

```
Driver: John Doe
Room: Room A (room_number = 1, room_name = 'Room A')
Bed: Bed 1 (bed_number = 1, bed_name = 'Bed 1')
Shift: Morning
Rent: ₹100/day
```

**Display:**

- "John Doe assigned to Room A, Bed 1, Morning Shift"

---

### **Sample Bed Status:**

```
Room A, Bed 1:
- Morning: John Doe
- Night: Available

Room A, Bed 2:
- Morning: Available
- Night: Jane Smith

Room B, Bed 1:
- Morning: Mike Wilson
- Night: Sarah Lee
```

---

## 🧪 **Verification Steps**

### **Step 1: Check Room Names**

```sql
SELECT room_number, room_name FROM rooms ORDER BY room_number;
```

**Expected:**
All rooms should show letter names (A, B, C, D, E, F)

---

### **Step 2: Check Bed Names**

```sql
SELECT
  r.room_name,
  b.bed_name
FROM beds b
JOIN rooms r ON r.id = b.room_id
WHERE r.room_number <= 2
ORDER BY r.room_number, b.bed_number;
```

**Expected:**
All beds should show number names (1, 2, 3, 4, 5)

---

### **Step 3: Check UI**

1. Go to Admin → Drivers
2. Click on any driver
3. Go to Accommodation tab
4. Check room and bed names
5. Should show: "Room A", "Bed 1", etc.

---

## 📈 **Future Scalability**

### **Adding More Rooms:**

```sql
-- Add Room G (7th room)
INSERT INTO rooms (room_number, room_name, total_beds)
VALUES (7, 'Room G', 5);

-- Add Room Z (26th room)
INSERT INTO rooms (room_number, room_name, total_beds)
VALUES (26, 'Room Z', 5);

-- Add Room AA (27th room) - if needed
INSERT INTO rooms (room_number, room_name, total_beds)
VALUES (27, 'Room AA', 5);
```

**Formula supports up to:**

- Single letters: A-Z (26 rooms)
- Double letters: AA-ZZ (676 more rooms)
- Unlimited scalability

---

### **Adding More Beds Per Room:**

```sql
-- Add 6th bed to Room A
INSERT INTO beds (room_id, bed_number, bed_name)
VALUES (
  (SELECT id FROM rooms WHERE room_number = 1),
  6,
  'Bed 6'
);
```

**Pattern:** Just increment the number

---

## 🎯 **Summary**

### **What Changed:**

1. ✅ Room names: Numbers → Alphabets (Room A, Room B, etc.)
2. ✅ Bed names: Letters → Numbers (Bed 1, Bed 2, etc.)
3. ✅ Created update SQL script
4. ✅ Created fresh install SQL script
5. ✅ Added documentation
6. ✅ Maintained backwards compatibility

### **What Stayed the Same:**

- ✅ Database structure (no column changes)
- ✅ Relationships (all foreign keys intact)
- ✅ Sorting logic (still uses integer columns)
- ✅ Query performance (indexes unchanged)

### **Benefits:**

- ✅ Clearer communication
- ✅ Less confusion
- ✅ Professional naming
- ✅ Better UX
- ✅ Intuitive system

---

## 📞 **Example Communication**

**Admin to Driver:**

```
"You're assigned to Room A, Bed 2, Morning Shift"
```

**Driver understands:**

- Room: A (letter)
- Bed: 2 (number)
- Shift: Morning
- Clear and unambiguous!

---

**Status:** ✅ **NAMING CONVENTION UPDATED!** 🚀

Rooms now use alphabets (A-F) and beds use numbers (1-5)! 🎉

