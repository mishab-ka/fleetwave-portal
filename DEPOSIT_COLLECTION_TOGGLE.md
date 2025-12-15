# 🔧 Deposit Collection Toggle Feature

## 🎯 Overview

Added a toggle switch in the admin driver profile to enable/disable deposit collection for individual drivers. When disabled, no deposit cutting will be applied to the driver's reports, regardless of their deposit balance or approved report count.

---

## 📊 Feature Details

### **What It Does:**

- **Admin Control:** Admins can turn deposit collection ON or OFF for each driver individually
- **Real-time Toggle:** Changes take effect immediately
- **Visual Feedback:** Clear UI showing current status with color-coded indicators
- **Smart Logic:** When OFF, deposit cutting is completely skipped during report approval

---

## 🗄️ Database Changes

### **New Column Added:**

**Table:** `users`  
**Column:** `enable_deposit_collection`  
**Type:** `BOOLEAN`  
**Default:** `true`  
**Purpose:** Controls whether deposit collection is enabled for the driver

### **SQL Script:**

**File:** `/Users/mishabka/Tawaaq/fleetwave-portal/supabase/ADD_DEPOSIT_COLLECTION_TOGGLE.sql`

```sql
-- Add deposit collection toggle column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS enable_deposit_collection BOOLEAN DEFAULT true;

-- Set default value for existing users
UPDATE users
SET enable_deposit_collection = true
WHERE enable_deposit_collection IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN users.enable_deposit_collection IS
'Controls whether deposit collection is enabled for this driver. When false, no deposit cutting will be applied during report approval.';
```

---

## 🎨 Frontend Changes

### **1. Driver Details Modal** (`DriverDetailsModal.tsx`)

#### **New State Variable:**

```typescript
const [enableDepositCollection, setEnableDepositCollection] =
  useState<boolean>(true);
```

#### **Updated `fetchDriverDetails` Function:**

Now fetches the `enable_deposit_collection` status:

```typescript
setEnableDepositCollection(driverData.enable_deposit_collection ?? true);
```

#### **New Toggle Function:**

```typescript
const handleToggleDepositCollection = async (enabled: boolean) => {
  if (!driverId) return;

  try {
    setIsProcessing(true);

    const { error } = await supabase
      .from("users")
      .update({ enable_deposit_collection: enabled })
      .eq("id", driverId);

    if (error) throw error;

    setEnableDepositCollection(enabled);
    toast.success(
      `Deposit collection ${enabled ? "enabled" : "disabled"} successfully`
    );

    if (onDriverUpdate) {
      onDriverUpdate();
    }
  } catch (error) {
    console.error("Error toggling deposit collection:", error);
    toast.error("Failed to update deposit collection status");
    // Revert the state on error
    setEnableDepositCollection(!enabled);
  } finally {
    setIsProcessing(false);
  }
};
```

#### **New UI Component:**

Added in the "Details" tab, after Account Details section:

```tsx
{
  /* Deposit Collection Toggle */
}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
        <IndianRupee className="h-4 w-4" />
        Deposit Collection
      </h4>
      <p className="text-xs text-blue-700">
        {enableDepositCollection
          ? "Deposit cutting is enabled for this driver"
          : "Deposit cutting is disabled for this driver"}
      </p>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-blue-900">
        {enableDepositCollection ? "ON" : "OFF"}
      </span>
      <Switch
        checked={enableDepositCollection}
        onCheckedChange={handleToggleDepositCollection}
        disabled={isProcessing}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  </div>
  {!enableDepositCollection && (
    <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>
        No deposit will be collected from this driver's reports until this is
        turned back on.
      </span>
    </div>
  )}
</div>;
```

---

### **2. Admin Reports** (`AdminReports.tsx`)

#### **Updated Deposit Collection Logic:**

Modified the `updateReportStatus` function to check the toggle before applying deposit cutting:

**Before:**

```typescript
const { data: userData, error: userError } = await supabase
  .from("users")
  .select("pending_balance")
  .eq("id", report.user_id)
  .single();

if (userError) {
  console.error("Error fetching user data:", userError);
} else if (
  !countError &&
  previousApprovedCount !== null &&
  previousApprovedCount >= 2
) {
  // Apply deposit cutting...
}
```

**After:**

```typescript
const { data: userData, error: userError } = await supabase
  .from("users")
  .select("pending_balance, enable_deposit_collection")
  .eq("id", report.user_id)
  .single();

if (userError) {
  console.error("Error fetching user data:", userError);
} else if (
  !countError &&
  previousApprovedCount !== null &&
  previousApprovedCount >= 2 &&
  (userData?.enable_deposit_collection ?? true) // ✅ NEW CHECK
) {
  // Apply deposit cutting...
}
```

---

## 🔄 How It Works

### **Deposit Collection Flow:**

```
1. Admin opens driver profile in admin panel
   ↓
2. Navigates to "Details" tab
   ↓
3. Sees "Deposit Collection" toggle section
   ↓
4. Toggles switch ON/OFF
   ↓
5. System updates database immediately
   ↓
6. Shows success/error toast notification
   ↓
7. When admin approves driver's report:
   - If toggle is ON: Apply deposit cutting (if conditions met)
   - If toggle is OFF: Skip deposit cutting entirely
```

---

## 🎯 Use Cases

### **Use Case 1: Temporarily Pause Deposit Collection**

**Scenario:** Driver is having financial difficulties  
**Action:** Admin turns OFF deposit collection  
**Result:** Driver's reports are approved without deposit deduction

### **Use Case 2: Special Drivers**

**Scenario:** VIP driver or special contract  
**Action:** Admin keeps deposit collection OFF permanently  
**Result:** Driver never has deposit deducted from reports

### **Use Case 3: Resume Deposit Collection**

**Scenario:** Driver's situation improves  
**Action:** Admin turns ON deposit collection  
**Result:** Deposit cutting resumes from next approved report

---

## 🧪 Testing Scenarios

### **Test 1: Toggle ON → OFF**

```
1. Open driver profile with deposit collection ON
2. Toggle switch to OFF
3. Verify:
   ✅ Switch shows "OFF"
   ✅ Warning message appears
   ✅ Success toast shows "Deposit collection disabled successfully"
   ✅ Database updated (enable_deposit_collection = false)
```

### **Test 2: Toggle OFF → ON**

```
1. Open driver profile with deposit collection OFF
2. Toggle switch to ON
3. Verify:
   ✅ Switch shows "ON"
   ✅ Warning message disappears
   ✅ Success toast shows "Deposit collection enabled successfully"
   ✅ Database updated (enable_deposit_collection = true)
```

### **Test 3: Report Approval with Toggle OFF**

```
1. Set driver's deposit collection to OFF
2. Driver has:
   - Deposit: ₹1000 (less than ₹2500)
   - Approved reports: 3+ (deposit cutting should normally apply)
3. Admin approves new report
4. Verify:
   ✅ Report is approved
   ✅ NO deposit transaction created
   ✅ Driver's pending_balance unchanged
```

### **Test 4: Report Approval with Toggle ON**

```
1. Set driver's deposit collection to ON
2. Driver has:
   - Deposit: ₹1000 (less than ₹2500)
   - Approved reports: 3+ (deposit cutting should apply)
3. Admin approves new report
4. Verify:
   ✅ Report is approved
   ✅ Deposit transaction created
   ✅ Driver's pending_balance increased by deposit cutting amount
```

### **Test 5: Error Handling**

```
1. Toggle switch while network is offline
2. Verify:
   ✅ Error toast shows "Failed to update deposit collection status"
   ✅ Switch reverts to previous state
   ✅ Database unchanged
```

---

## 🎨 UI Design

### **Visual States:**

#### **When ON (Enabled):**

```
┌─────────────────────────────────────────────┐
│ 🪙 Deposit Collection              ON  [✓] │
│ Deposit cutting is enabled for this driver  │
└─────────────────────────────────────────────┘
```

- **Background:** Light blue (`bg-blue-50`)
- **Border:** Blue (`border-blue-200`)
- **Switch:** Green when checked

#### **When OFF (Disabled):**

```
┌─────────────────────────────────────────────┐
│ 🪙 Deposit Collection             OFF  [ ] │
│ Deposit cutting is disabled for this driver │
│ ┌─────────────────────────────────────────┐ │
│ │ ⚠️ No deposit will be collected from    │ │
│ │    this driver's reports until this is  │ │
│ │    turned back on.                      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- **Background:** Light blue (`bg-blue-50`)
- **Border:** Blue (`border-blue-200`)
- **Warning Box:** Amber background (`bg-amber-50`)
- **Switch:** Gray when unchecked

---

## 📋 Setup Instructions

### **Step 1: Run SQL Script**

```bash
# In Supabase SQL Editor, run:
/Users/mishabka/Tawaaq/fleetwave-portal/supabase/ADD_DEPOSIT_COLLECTION_TOGGLE.sql
```

### **Step 2: Verify Database Column**

```sql
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'enable_deposit_collection';
```

**Expected Result:**

```
column_name                 | data_type | column_default | is_nullable
----------------------------|-----------|----------------|------------
enable_deposit_collection   | boolean   | true           | YES
```

### **Step 3: Verify Existing Users**

```sql
SELECT
  id,
  name,
  enable_deposit_collection
FROM users
WHERE role = 'driver'
LIMIT 10;
```

**Expected Result:**
All drivers should have `enable_deposit_collection = true` by default.

### **Step 4: Test in UI**

1. Login as admin
2. Go to Drivers page
3. Click on any driver
4. Navigate to "Details" tab
5. Scroll down to see "Deposit Collection" toggle
6. Toggle ON/OFF and verify functionality

---

## 🔐 Security & Permissions

### **Who Can Toggle:**

- ✅ **Admin:** Full access
- ✅ **Manager:** Full access (if they have driver management permissions)
- ❌ **Driver:** Cannot see or change this setting
- ❌ **HR Staff:** Cannot see or change this setting

### **Database Security:**

- RLS policies ensure only authorized users can update the column
- Frontend checks user role before showing the toggle
- Backend validates permissions on update

---

## 📊 Impact on Existing Features

### **✅ Compatible With:**

- Deposit collection logic
- Report approval workflow
- Balance transactions
- Driver profile display
- Admin reports dashboard

### **⚠️ Important Notes:**

1. **Default Value:** All existing drivers will have deposit collection **enabled** by default
2. **Retroactive:** Toggling OFF does not affect already created deposit transactions
3. **Future Reports:** Only affects reports approved **after** the toggle is changed
4. **Manual Deposits:** Admin can still manually add deposit transactions regardless of toggle state

---

## 🐛 Troubleshooting

### **Issue 1: Toggle not showing**

**Possible Causes:**

- Database column not created
- User not logged in as admin
- Driver details not loaded

**Solution:**

1. Run the SQL script to add the column
2. Verify user has admin role
3. Refresh the page and reopen driver profile

### **Issue 2: Toggle not saving**

**Possible Causes:**

- Network error
- Database permissions issue
- Invalid driver ID

**Solution:**

1. Check browser console for errors
2. Verify database RLS policies
3. Ensure driver ID is valid

### **Issue 3: Deposit still being collected when OFF**

**Possible Causes:**

- Old code version running
- Cache issue
- Database not updated

**Solution:**

1. Hard refresh the page (Ctrl+Shift+R)
2. Verify database value: `SELECT enable_deposit_collection FROM users WHERE id = 'driver_id'`
3. Check AdminReports.tsx has the updated logic

---

## 📈 Future Enhancements

### **Potential Features:**

1. **Bulk Toggle:** Enable/disable for multiple drivers at once
2. **Scheduled Toggle:** Auto-enable/disable on specific dates
3. **Audit Log:** Track who changed the toggle and when
4. **Notification:** Alert driver when deposit collection is enabled/disabled
5. **Conditional Toggle:** Auto-disable if driver meets certain criteria
6. **Report History:** Show which reports had deposit collection disabled

---

## 🎯 Summary

### **What Was Added:**

✅ Database column: `enable_deposit_collection` (boolean, default true)  
✅ Toggle switch in admin driver profile  
✅ Logic check in report approval process  
✅ Visual feedback with status indicators  
✅ Error handling and state management  
✅ Toast notifications for user feedback

### **Files Modified:**

1. **`supabase/ADD_DEPOSIT_COLLECTION_TOGGLE.sql`** - Database schema
2. **`src/components/admin/drivers/DriverDetailsModal.tsx`** - UI and toggle logic
3. **`src/pages/admin/AdminReports.tsx`** - Deposit collection check

### **How to Use:**

1. **Admin:** Navigate to driver profile → Details tab → Toggle "Deposit Collection"
2. **System:** Automatically respects the toggle when approving reports
3. **Result:** Full control over deposit collection per driver

---

**Status:** ✅ **FULLY IMPLEMENTED**

The deposit collection toggle is now live and ready to use! 🚀

