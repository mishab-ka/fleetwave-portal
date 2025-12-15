# 🚀 Quick Setup: Deposit Collection Toggle

## ⚡ 3-Step Setup

### **Step 1: Run SQL Script** (1 minute)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste this script:

```sql
-- Add deposit collection toggle column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS enable_deposit_collection BOOLEAN DEFAULT true;

-- Set default value for existing users
UPDATE users
SET enable_deposit_collection = true
WHERE enable_deposit_collection IS NULL;
```

4. Click "Run" ✅

---

### **Step 2: Verify Database** (30 seconds)

Run this query to confirm:

```sql
SELECT
  id,
  name,
  enable_deposit_collection
FROM users
WHERE role = 'driver'
LIMIT 5;
```

**Expected:** All drivers should show `enable_deposit_collection = true`

---

### **Step 3: Test in UI** (2 minutes)

1. Login as **admin**
2. Go to **Drivers** page
3. Click on any driver
4. Navigate to **"Details"** tab
5. Scroll down to see **"Deposit Collection"** section
6. Toggle the switch ON/OFF
7. Verify success toast appears ✅

---

## 🎯 How to Use

### **To Disable Deposit Collection:**

1. Open driver profile
2. Go to "Details" tab
3. Find "Deposit Collection" section (blue box)
4. Toggle switch to **OFF**
5. See warning message appear
6. Done! ✅

### **To Enable Deposit Collection:**

1. Open driver profile
2. Go to "Details" tab
3. Find "Deposit Collection" section (blue box)
4. Toggle switch to **ON**
5. Warning message disappears
6. Done! ✅

---

## 🧪 Quick Test

### **Test Scenario:**

1. **Setup:**

   - Find a driver with deposit < ₹2500
   - Driver has 3+ approved reports
   - Turn deposit collection **OFF**

2. **Action:**

   - Approve a new report for this driver

3. **Expected Result:**

   - Report approved ✅
   - **NO** deposit transaction created ✅
   - Driver's balance unchanged ✅

4. **Turn ON and Test Again:**
   - Turn deposit collection **ON**
   - Approve another report
   - Deposit transaction created ✅
   - Driver's balance increased ✅

---

## 📍 Where to Find It

```
Admin Panel
  └── Drivers
      └── Click on Driver
          └── Details Tab
              └── Scroll down
                  └── "Deposit Collection" section (blue box)
```

---

## 🎨 What It Looks Like

### **When Enabled (ON):**

```
┌─────────────────────────────────────┐
│ 🪙 Deposit Collection      ON  [✓] │
│ Deposit cutting is enabled          │
└─────────────────────────────────────┘
```

### **When Disabled (OFF):**

```
┌─────────────────────────────────────┐
│ 🪙 Deposit Collection     OFF  [ ] │
│ Deposit cutting is disabled         │
│ ┌─────────────────────────────────┐ │
│ │ ⚠️ No deposit will be collected │ │
│ │    until this is turned back on │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## ⚠️ Important Notes

1. **Default:** All drivers have deposit collection **enabled** by default
2. **Immediate Effect:** Changes take effect on the **next** approved report
3. **Manual Control:** Admin can still manually add deposits regardless of toggle
4. **No Retroactive:** Toggling OFF doesn't affect already created transactions

---

## 🐛 Troubleshooting

### **Toggle Not Showing?**

- ✅ Run the SQL script first
- ✅ Refresh the page
- ✅ Make sure you're logged in as admin

### **Toggle Not Saving?**

- ✅ Check your internet connection
- ✅ Check browser console for errors
- ✅ Try refreshing and toggling again

### **Deposit Still Being Collected?**

- ✅ Hard refresh the page (Ctrl+Shift+R)
- ✅ Verify toggle is OFF in the UI
- ✅ Check database: `SELECT enable_deposit_collection FROM users WHERE id = 'driver_id'`

---

## 📞 Support

If you encounter any issues:

1. Check the full documentation: `DEPOSIT_COLLECTION_TOGGLE.md`
2. Verify SQL script was run successfully
3. Check browser console for errors
4. Verify database column exists

---

**Status:** ✅ **READY TO USE**

That's it! The feature is now active and ready to use. 🎉

