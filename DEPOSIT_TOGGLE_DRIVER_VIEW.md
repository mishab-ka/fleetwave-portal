# 🎯 Deposit Collection Toggle - Driver View Update

## 📋 Overview

Updated the driver's `SubmitReport.tsx` page to show/hide the deposit cutting information based on the admin's deposit collection toggle setting.

---

## ✅ What Was Changed

### **File Modified:** `src/pages/SubmitReport.tsx`

---

## 🔧 Changes Made

### **1. Added State Variable**

**Line 34:**

```typescript
const [enableDepositCollection, setEnableDepositCollection] = useState(true);
```

**Purpose:** Track whether deposit collection is enabled for the current driver.

---

### **2. Fetch Deposit Collection Status**

**Line 89:**

```typescript
setEnableDepositCollection(data.enable_deposit_collection ?? true);
```

**Purpose:** Load the driver's deposit collection status when fetching user data.

**Location:** Inside `fetchUserData` function, after setting user data.

---

### **3. Updated Deposit Cutting Calculation**

**Lines 308-337:**

**Before:**

```typescript
// Calculate deposit cutting based on approved reports
useEffect(() => {
  if (!userData) return;

  // Only apply deposit cutting if driver has 2 or more approved reports
  if (approvedReportsCount >= 2) {
    // ... calculation logic
  }
}, [userData, approvedReportsCount]);
```

**After:**

```typescript
// Calculate deposit cutting based on approved reports and toggle status
useEffect(() => {
  if (!userData) return;

  // Only apply deposit cutting if:
  // 1. Deposit collection is enabled for this driver
  // 2. Driver has 2 or more approved reports
  if (enableDepositCollection && approvedReportsCount >= 2) {
    // ... calculation logic
  } else {
    setDepositCutting(0);
  }
}, [userData, approvedReportsCount, enableDepositCollection]);
```

**Changes:**

- Added `enableDepositCollection` check before calculating deposit cutting
- Added `enableDepositCollection` to dependency array
- If toggle is OFF, deposit cutting is always 0

---

### **4. Updated UI Display**

**Lines 933-967:**

**Before:**

```tsx
{
  /* Deposit Cutting Information */
}
{
  /* {depositCutting > 0 && (
  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
    ...
  </div>
)} */
}
```

**After:**

```tsx
{/* Deposit Cutting Information - Only show if enabled and amount > 0 */}
{enableDepositCollection && depositCutting > 0 && (
  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
    <div className="flex items-center gap-2 mb-2">
      <svg className="w-5 h-5 text-blue-600" ...>
        ...
      </svg>
      <span className="font-semibold text-blue-800">
        Deposit Collection
      </span>
    </div>
    <p className="text-sm text-blue-700">
      Daily deposit cutting: ₹{depositCutting.toFixed(2)}
    </p>
    <p className="text-xs text-blue-600 mt-1">
      Current deposit: ₹{(userData?.pending_balance || 0).toFixed(2)} |
      Target: ₹2,500 |
      Remaining: ₹{(2500 - (userData?.pending_balance || 0)).toFixed(2)}
    </p>
    <p className="text-xs text-blue-600 mt-1">
      This amount will be added to your deposit balance.
    </p>
  </div>
)}
```

**Changes:**

- Uncommented the deposit cutting UI
- Added `enableDepositCollection` condition
- Only shows when BOTH conditions are true:
  1. `enableDepositCollection === true`
  2. `depositCutting > 0`

---

## 🎯 How It Works

### **Flow Diagram:**

```
Driver Opens Submit Report Page
         ↓
Fetch User Data (including enable_deposit_collection)
         ↓
Set enableDepositCollection state
         ↓
Calculate Deposit Cutting
         ↓
    Is Toggle ON?
    /           \
  YES            NO
   ↓              ↓
Calculate      Set depositCutting = 0
Cutting        Don't show UI
Amount
   ↓
Show UI with
Cutting Amount
```

---

## 📊 Scenarios

### **Scenario 1: Toggle ON + Deposit Needed**

**Conditions:**

- Admin has deposit collection toggle **ON**
- Driver has 2+ approved reports
- Current deposit < ₹2,500

**Result:**

```
┌────────────────────────────────────────┐
│ 🪙 Deposit Collection                  │
│                                        │
│ Daily deposit cutting: ₹250            │
│ Current deposit: ₹1,000 | Target:      │
│ ₹2,500 | Remaining: ₹1,500             │
│                                        │
│ This amount will be added to your      │
│ deposit balance.                       │
└────────────────────────────────────────┘
```

---

### **Scenario 2: Toggle OFF**

**Conditions:**

- Admin has deposit collection toggle **OFF**
- Driver has 2+ approved reports
- Current deposit < ₹2,500

**Result:**

```
(No deposit collection UI shown)
```

**Deposit Cutting:** ₹0  
**UI Display:** Hidden

---

### **Scenario 3: Toggle ON + Deposit Complete**

**Conditions:**

- Admin has deposit collection toggle **ON**
- Driver has 2+ approved reports
- Current deposit >= ₹2,500

**Result:**

```
(No deposit collection UI shown)
```

**Deposit Cutting:** ₹0  
**UI Display:** Hidden (because deposit is already complete)

---

### **Scenario 4: Toggle ON + Less Than 2 Reports**

**Conditions:**

- Admin has deposit collection toggle **ON**
- Driver has 0 or 1 approved reports
- Current deposit < ₹2,500

**Result:**

```
(No deposit collection UI shown)
```

**Deposit Cutting:** ₹0  
**UI Display:** Hidden (grace period - first 2 reports)

---

## 🧪 Testing Steps

### **Test 1: Toggle OFF → Driver View**

1. **Admin:** Open driver profile
2. **Admin:** Turn deposit collection toggle **OFF**
3. **Driver:** Login and go to Submit Report page
4. **Verify:**
   - ✅ No deposit collection UI shown
   - ✅ Deposit cutting amount is ₹0
   - ✅ Payment calculation doesn't include deposit

---

### **Test 2: Toggle ON → Driver View**

1. **Admin:** Open driver profile
2. **Admin:** Turn deposit collection toggle **ON**
3. **Driver:** Login and go to Submit Report page
4. **Driver:** Has 2+ approved reports and deposit < ₹2,500
5. **Verify:**
   - ✅ Deposit collection UI shown
   - ✅ Deposit cutting amount displayed
   - ✅ Payment calculation includes deposit

---

### **Test 3: Toggle ON → OFF (Real-time)**

1. **Driver:** Open Submit Report page (toggle is ON, UI showing)
2. **Admin:** Turn toggle OFF for this driver
3. **Driver:** Refresh the page
4. **Verify:**
   - ✅ Deposit collection UI disappears
   - ✅ Deposit cutting becomes ₹0

---

### **Test 4: Toggle OFF → ON (Real-time)**

1. **Driver:** Open Submit Report page (toggle is OFF, no UI)
2. **Admin:** Turn toggle ON for this driver
3. **Driver:** Refresh the page
4. **Verify:**
   - ✅ Deposit collection UI appears
   - ✅ Deposit cutting amount calculated and shown

---

## 💡 Key Points

### **1. Automatic Calculation**

The deposit cutting amount is **automatically calculated** based on:

- Toggle status (ON/OFF)
- Approved reports count (must be 2+)
- Current deposit balance (must be < ₹2,500)
- Remaining forms (10 - (approved - 2))

### **2. Real-time Updates**

When admin toggles the setting:

- Driver must **refresh** the Submit Report page
- Changes take effect **immediately**
- No delay or caching issues

### **3. Payment Calculation**

The deposit cutting is included in the rent calculation:

```typescript
const totalRentWithExtras =
  rent + dailyPenaltyAmount + platformFee + depositCutting;
```

If toggle is OFF:

```typescript
depositCutting = 0;
// So it's not added to the total
```

### **4. UI Visibility**

The deposit collection UI is shown **ONLY** when:

```typescript
enableDepositCollection === true && depositCutting > 0;
```

Both conditions must be true!

---

## 🎨 UI Design

### **Deposit Collection Card (When Shown):**

```
┌─────────────────────────────────────────────────┐
│ 🪙 Deposit Collection                           │
│                                                 │
│ Daily deposit cutting: ₹250                     │
│                                                 │
│ Current deposit: ₹1,000 | Target: ₹2,500 |     │
│ Remaining: ₹1,500                               │
│                                                 │
│ This amount will be added to your deposit       │
│ balance.                                        │
└─────────────────────────────────────────────────┘
```

**Styling:**

- Background: Light blue (`bg-blue-50`)
- Border: Blue (`border border-blue-200`)
- Icon: Blue wallet/money icon
- Text: Blue shades for different emphasis levels

---

## 📋 Summary

### **What Changed:**

1. ✅ Added `enableDepositCollection` state
2. ✅ Fetch toggle status from database
3. ✅ Check toggle before calculating deposit cutting
4. ✅ Show/hide UI based on toggle status
5. ✅ Include deposit in payment calculation only when enabled

### **Driver Experience:**

**When Toggle is ON:**

- Sees deposit collection information
- Deposit amount is calculated and shown
- Deposit is included in payment

**When Toggle is OFF:**

- Doesn't see deposit collection information
- No deposit cutting applied
- Payment doesn't include deposit

### **Admin Control:**

Admin can now control deposit collection per driver:

- Turn ON: Driver sees and pays deposit cutting
- Turn OFF: Driver doesn't see or pay deposit cutting

---

## 🔄 Integration with Admin Panel

### **Admin Panel (DriverDetailsModal.tsx):**

- Toggle switch to enable/disable deposit collection
- Updates `users.enable_deposit_collection` in database

### **Driver View (SubmitReport.tsx):**

- Reads `users.enable_deposit_collection` from database
- Shows/hides deposit UI accordingly
- Includes/excludes deposit in calculations

### **Report Approval (AdminReports.tsx):**

- Checks `users.enable_deposit_collection` before creating deposit transaction
- Only creates transaction if toggle is ON

---

**Status:** ✅ **FULLY IMPLEMENTED**

The deposit collection toggle now controls the driver's view and calculations! 🎉

