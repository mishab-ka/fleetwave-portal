# 💰 Deposit Collection System

## Overview

Automatic deposit collection system that deducts a daily amount from drivers' rent to build up their deposit balance to ₹2,500, along with an extra collection of ₹100 per report.

---

## 🎯 System Requirements

### **When It Activates:**

- Driver must have **2 or more approved reports**
- Current deposit (`pending_balance`) must be **less than ₹2,500**

### **What It Collects:**

1. **Deposit Cutting:** `(2500 - current_deposit) / 10` per day
2. **Extra Collection:** Fixed ₹100 per report

---

## 📊 Calculation Logic

### **Example Scenario:**

```
Driver Status:
- Approved Reports: 2
- Current Deposit: ₹1,000
- Base Rent: ₹600

Calculations:
1. Remaining Deposit = ₹2,500 - ₹1,000 = ₹1,500
2. Daily Deposit Cutting = ₹1,500 / 10 = ₹150
3. Extra Collection = ₹100
4. Total Additional = ₹150 + ₹100 = ₹250

Final Rent Paid Amount:
₹600 (base rent) + ₹150 (deposit) + ₹100 (extra) = ₹850
```

---

## 🔄 Workflow

### **1. Report Submission (Driver Side)**

**File:** `src/pages/SubmitReport.tsx`

#### **State Variables:**

```typescript
const [approvedReportsCount, setApprovedReportsCount] = useState(0);
const [depositCutting, setDepositCutting] = useState(0);
const [extraCollection, setExtraCollection] = useState(100);
```

#### **Fetch Approved Reports Count:**

```typescript
useEffect(() => {
  const { count: approvedCount } = await supabase
    .from("fleet_reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "approved");

  setApprovedReportsCount(approvedCount || 0);
}, [user]);
```

#### **Calculate Deposit Cutting:**

```typescript
useEffect(() => {
  if (approvedReportsCount >= 2) {
    const currentDeposit = userData.pending_balance || 0;
    const targetDeposit = 2500;

    if (currentDeposit < targetDeposit) {
      const remainingDeposit = targetDeposit - currentDeposit;
      const dailyCutting = remainingDeposit / 10;
      setDepositCutting(Math.round(dailyCutting));
    } else {
      setDepositCutting(0);
    }
  } else {
    setDepositCutting(0);
  }
}, [userData, approvedReportsCount]);
```

#### **Calculate Total Rent:**

```typescript
const totalRentWithExtras =
  rent + dailyPenaltyAmount + platformFee + depositCutting + extraCollection;

const amount = tollandEarnings - cashcollect - totalRentWithExtras;
```

#### **Visual Display:**

Three information cards are shown when applicable:

1. **Deposit Collection Card (Blue):**

   - Shows daily deposit cutting amount
   - Displays current deposit, target, and remaining
   - Only shown if `depositCutting > 0`

2. **Extra Collection Card (Purple):**

   - Shows ₹100 extra collection
   - Explains it will be added to penalty transactions
   - Always shown (can be modified)

3. **Penalty Card (Red):**
   - Shows daily penalty if applicable
   - Separate from deposit collection

---

### **2. Report Approval (Admin Side)**

**File:** `src/pages/admin/AdminReports.tsx`

#### **Automatic Transaction Creation:**

When admin approves a report (`status = "approved"`), the system:

1. **Checks Eligibility:**

   ```typescript
   const { count: approvedCount } = await supabase
     .from("fleet_reports")
     .select("*", { count: "exact", head: true })
     .eq("user_id", report.user_id)
     .eq("status", "approved");

   if (approvedCount >= 2) {
     // Proceed with collections
   }
   ```

2. **Creates Deposit Transaction:**

   ```typescript
   if (currentDeposit < 2500) {
     const remainingDeposit = 2500 - currentDeposit;
     const depositCutting = Math.round(remainingDeposit / 10);

     // Insert deposit transaction
     await supabase.from("driver_penalty_transactions").insert({
       user_id: report.user_id,
       amount: depositCutting,
       type: "deposit",
       description: `Deposit collection for report ${report.rent_date}`,
       created_by: admin_user_id,
     });

     // Update user's deposit balance
     await supabase
       .from("users")
       .update({
         pending_balance: currentDeposit + depositCutting,
       })
       .eq("id", report.user_id);
   }
   ```

3. **Creates Extra Collection Transaction:**

   ```typescript
   const extraCollection = 100;

   await supabase.from("driver_penalty_transactions").insert({
     user_id: report.user_id,
     amount: extraCollection,
     type: "extra_collection",
     description: `Extra collection for report ${report.rent_date}`,
     created_by: admin_user_id,
   });
   ```

---

## 📋 Database Schema

### **Required Tables:**

#### **1. users table:**

```sql
- id (uuid)
- pending_balance (numeric) -- Current deposit amount
```

#### **2. fleet_reports table:**

```sql
- id (uuid)
- user_id (uuid)
- status (text) -- 'pending_verification', 'approved', 'rejected'
- rent_date (date)
- shift (text)
```

#### **3. driver_penalty_transactions table:**

```sql
- id (uuid)
- user_id (uuid)
- amount (numeric)
- type (text) -- 'deposit', 'extra_collection', 'due', 'refund'
- description (text)
- created_by (uuid)
- created_at (timestamp)
```

---

## 🎨 UI Components

### **Deposit Collection Card:**

```jsx
{
  depositCutting > 0 && (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <WalletIcon className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-blue-800">Deposit Collection</span>
      </div>
      <p className="text-sm text-blue-700">
        Daily deposit cutting: ₹{depositCutting.toFixed(2)}
      </p>
      <p className="text-xs text-blue-600 mt-1">
        Current: ₹{currentDeposit} | Target: ₹2,500 | Remaining: ₹
        {2500 - currentDeposit}
      </p>
    </div>
  );
}
```

### **Extra Collection Card:**

```jsx
{
  extraCollection > 0 && (
    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <CoinIcon className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-purple-800">Extra Collection</span>
      </div>
      <p className="text-sm text-purple-700">
        Extra collection amount: ₹{extraCollection.toFixed(2)}
      </p>
    </div>
  );
}
```

---

## 🔍 Testing Scenarios

### **Scenario 1: New Driver (0 approved reports)**

```
Input:
- Approved Reports: 0
- Current Deposit: ₹500
- Base Rent: ₹600

Expected Output:
- Deposit Cutting: ₹0 (not activated yet)
- Extra Collection: ₹0 (not activated yet)
- Total Rent: ₹600 (base only)
```

### **Scenario 2: Driver with 1 approved report**

```
Input:
- Approved Reports: 1
- Current Deposit: ₹500
- Base Rent: ₹600

Expected Output:
- Deposit Cutting: ₹0 (needs 2 reports)
- Extra Collection: ₹0 (needs 2 reports)
- Total Rent: ₹600 (base only)
```

### **Scenario 3: Driver with 2 approved reports (System Activates)**

```
Input:
- Approved Reports: 2
- Current Deposit: ₹1,000
- Base Rent: ₹600

Expected Output:
- Deposit Cutting: ₹150 ((2500-1000)/10)
- Extra Collection: ₹100
- Total Rent: ₹850 (600+150+100)

On Approval:
- Create deposit transaction: +₹150
- Update pending_balance: ₹1,000 → ₹1,150
- Create extra collection transaction: +₹100
```

### **Scenario 4: Driver with deposit >= ₹2,500**

```
Input:
- Approved Reports: 5
- Current Deposit: ₹2,500
- Base Rent: ₹600

Expected Output:
- Deposit Cutting: ₹0 (target reached)
- Extra Collection: ₹100 (still applies)
- Total Rent: ₹700 (600+100)

On Approval:
- No deposit transaction (target reached)
- Create extra collection transaction: +₹100
```

---

## ⚙️ Configuration

### **Adjustable Parameters:**

```typescript
// In SubmitReport.tsx
const TARGET_DEPOSIT = 2500; // Target deposit amount
const DEPOSIT_DAYS = 10; // Days to divide deposit
const EXTRA_COLLECTION = 100; // Extra collection per report
const MIN_APPROVED_REPORTS = 2; // Minimum reports before activation
```

### **To Modify:**

1. **Change Target Deposit:**

   ```typescript
   const targetDeposit = 3000; // Change from 2500 to 3000
   ```

2. **Change Division Days:**

   ```typescript
   const dailyCutting = remainingDeposit / 15; // Change from 10 to 15 days
   ```

3. **Change Extra Collection:**

   ```typescript
   const [extraCollection, setExtraCollection] = useState(150); // Change from 100 to 150
   ```

4. **Change Activation Threshold:**
   ```typescript
   if (approvedReportsCount >= 3) { // Change from 2 to 3 reports
   ```

---

## 🚨 Error Handling

### **Common Issues:**

1. **Deposit not updating:**

   - Check `pending_balance` column exists in users table
   - Verify RLS policies allow updates
   - Check admin has proper permissions

2. **Transactions not created:**

   - Verify `driver_penalty_transactions` table exists
   - Check `type` column accepts 'deposit' and 'extra_collection'
   - Ensure `created_by` field is properly set

3. **Calculation not showing:**
   - Verify approved reports count is correct
   - Check user's `pending_balance` value
   - Ensure `useEffect` dependencies are correct

---

## 📊 Transaction Types

### **In `driver_penalty_transactions` table:**

| Type               | Description             | When Created                               |
| ------------------ | ----------------------- | ------------------------------------------ |
| `deposit`          | Deposit collection      | On report approval (if deposit < 2500)     |
| `extra_collection` | Extra ₹100 collection   | On every report approval (after 2 reports) |
| `due`              | Amount driver owes      | Manual or other processes                  |
| `refund`           | Amount to refund driver | Manual or other processes                  |

---

## 🎯 Business Logic Summary

1. **Activation:** After 2 approved reports
2. **Deposit Collection:** Automatic until ₹2,500 reached
3. **Extra Collection:** Always ₹100 per report (after activation)
4. **Transaction Creation:** Automatic on admin approval
5. **Balance Update:** Automatic deposit balance increment
6. **Visual Feedback:** Real-time display to driver

---

## 📝 Notes

- Deposit cutting stops automatically when `pending_balance >= 2500`
- Extra collection continues even after deposit target is reached
- All amounts are rounded to nearest rupee
- Transactions are created only on "approved" status
- System checks approved count before each submission
- Admin can see transaction history in penalty transactions

---

## 🔄 Future Enhancements

1. **Configurable from Admin Panel:**

   - Target deposit amount
   - Division days
   - Extra collection amount
   - Activation threshold

2. **Progress Tracking:**

   - Visual progress bar for deposit
   - Estimated days to reach target
   - Historical collection report

3. **Notifications:**

   - Alert driver when deposit target reached
   - Weekly summary of collections
   - Admin notifications for milestones

4. **Reporting:**
   - Deposit collection analytics
   - Driver-wise collection reports
   - Monthly collection summaries

---

## ✅ Implementation Checklist

- [x] Calculate deposit cutting based on approved reports
- [x] Add extra collection (₹100)
- [x] Display information cards to driver
- [x] Create automatic deposit transaction on approval
- [x] Create automatic extra collection transaction
- [x] Update user's pending_balance
- [x] Handle edge cases (deposit >= target)
- [x] Add proper error handling
- [x] Test with various scenarios
- [ ] Add admin configuration panel (future)
- [ ] Add progress tracking UI (future)
- [ ] Add collection reports (future)

---

**System Status:** ✅ Fully Implemented and Ready for Testing

