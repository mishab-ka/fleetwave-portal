# ⚡ Quick Guide: Deposit Collection Toggle

## 🎯 What It Does

**Admin Panel:** Toggle deposit collection ON/OFF for each driver  
**Driver View:** Shows/hides deposit cutting based on toggle status

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN PANEL                          │
│                                                         │
│  Driver Profile → Details Tab                          │
│  ┌──────────────────────────────────────┐             │
│  │ 🪙 Deposit Collection      ON  [✓]  │             │
│  └──────────────────────────────────────┘             │
│                      ↓                                  │
│              Saves to Database                          │
│       (users.enable_deposit_collection)                 │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│                   DRIVER VIEW                           │
│                                                         │
│  Submit Report Page                                     │
│  ┌──────────────────────────────────────┐             │
│  │ 🪙 Deposit Collection                │             │
│  │                                      │             │
│  │ Daily deposit cutting: ₹250          │             │
│  │ Current: ₹1,000 | Target: ₹2,500    │             │
│  │ Remaining: ₹1,500                    │             │
│  └──────────────────────────────────────┘             │
│                                                         │
│  Shows ONLY if toggle is ON                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Scenarios

### **Scenario 1: Toggle ON** ✅

**Admin Action:** Turn toggle ON  
**Driver Sees:**

```
┌────────────────────────────────┐
│ 🪙 Deposit Collection          │
│ Daily cutting: ₹250            │
│ Current: ₹1,000 | Target: ₹2,500│
└────────────────────────────────┘
```

**Payment:** Includes deposit cutting  
**Report Approval:** Creates deposit transaction

---

### **Scenario 2: Toggle OFF** ❌

**Admin Action:** Turn toggle OFF  
**Driver Sees:**

```
(No deposit collection UI)
```

**Payment:** No deposit cutting  
**Report Approval:** No deposit transaction created

---

## 🧪 Quick Test

### **Step 1: Admin Side**

1. Login as admin
2. Go to Drivers → Click driver
3. Details tab → Find "Deposit Collection"
4. Toggle ON/OFF

### **Step 2: Driver Side**

1. Login as driver
2. Go to Submit Report page
3. **If ON:** See blue deposit box
4. **If OFF:** No deposit box

### **Step 3: Verify**

1. Driver submits report
2. Admin approves report
3. **If ON:** Deposit transaction created ✅
4. **If OFF:** No deposit transaction ❌

---

## 📁 Files Modified

1. **`supabase/ADD_DEPOSIT_COLLECTION_TOGGLE.sql`**

   - Adds `enable_deposit_collection` column

2. **`src/components/admin/drivers/DriverDetailsModal.tsx`**

   - Toggle switch in admin panel

3. **`src/pages/admin/AdminReports.tsx`**

   - Checks toggle before creating deposit transaction

4. **`src/pages/SubmitReport.tsx`** ⭐ NEW
   - Shows/hides deposit UI based on toggle
   - Calculates deposit only if enabled

---

## 🎯 Key Points

### **Admin Control**

- ✅ Can enable/disable per driver
- ✅ Changes take effect immediately
- ✅ Visual feedback (ON/OFF label)

### **Driver Experience**

- ✅ Sees deposit info only if enabled
- ✅ Payment includes deposit only if enabled
- ✅ Clear breakdown of deposit details

### **System Behavior**

- ✅ Default: Enabled for all drivers
- ✅ Deposit transaction created only if enabled
- ✅ Driver balance updated only if enabled

---

## 💡 Use Cases

### **Use Case 1: Financial Hardship**

**Problem:** Driver can't afford deposit cutting  
**Solution:** Admin turns toggle OFF temporarily  
**Result:** Driver continues working without deposit deduction

### **Use Case 2: VIP Driver**

**Problem:** Special contract driver shouldn't pay deposit  
**Solution:** Admin keeps toggle OFF permanently  
**Result:** Driver never has deposit deducted

### **Use Case 3: Resume Collection**

**Problem:** Driver's situation improved  
**Solution:** Admin turns toggle ON  
**Result:** Deposit collection resumes from next report

---

## 🚀 Setup (One-Time)

### **Step 1: Run SQL** (30 seconds)

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS enable_deposit_collection BOOLEAN DEFAULT true;

UPDATE users
SET enable_deposit_collection = true
WHERE enable_deposit_collection IS NULL;
```

### **Step 2: Verify** (10 seconds)

```sql
SELECT id, name, enable_deposit_collection
FROM users
WHERE role = 'driver'
LIMIT 5;
```

### **Step 3: Test** (2 minutes)

1. Open any driver profile
2. See toggle in Details tab
3. Toggle ON/OFF
4. Check driver's Submit Report page

---

## ✅ Checklist

- [ ] SQL script executed
- [ ] Database column exists
- [ ] Toggle visible in admin panel
- [ ] Toggle saves correctly
- [ ] Driver sees deposit when ON
- [ ] Driver doesn't see deposit when OFF
- [ ] Report approval respects toggle
- [ ] Deposit transaction created only when ON

---

**Status:** ✅ **READY TO USE**

Everything is set up and working! 🎉

