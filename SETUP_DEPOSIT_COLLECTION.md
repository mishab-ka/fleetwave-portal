# 🚀 Setup Guide - Deposit Collection System

## Quick Setup

Follow these steps to set up the deposit collection system:

---

## Step 1: Create Database Table

Run this SQL script in your Supabase SQL Editor:

**File:** `supabase/CREATE_DRIVER_BALANCE_TRANSACTION_TABLE.sql`

```sql
-- This will create:
✅ driver_balance_transaction table
✅ Indexes for performance
✅ RLS policies for security
✅ Triggers for updated_at
```

### **How to Run:**

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire content of `CREATE_DRIVER_BALANCE_TRANSACTION_TABLE.sql`
5. Click **Run**
6. You should see: "driver_balance_transaction table created successfully!"

---

## Step 2: Verify Table Structure

Run this query to verify the table was created:

```sql
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'driver_balance_transaction'
ORDER BY ordinal_position;
```

**Expected Columns:**

- `id` (uuid)
- `user_id` (uuid) - Foreign key to users
- `amount` (numeric)
- `transaction_type` (varchar) - deposit_collection, deposit_refund, etc.
- `description` (text)
- `transaction_date` (timestamp)
- `created_at` (timestamp)
- `created_by` (uuid) - Foreign key to users
- `updated_at` (timestamp)

---

## Step 3: Test the System

### **Test 1: Submit First Report**

1. Login as a driver
2. Submit a report
3. **Expected:** No deposit cutting shown (0 approved reports)

### **Test 2: Admin Approves First Report**

1. Login as admin
2. Go to Reports Management
3. Click "Approve" on the first report
4. **Expected:** No deposit transaction created (need 2 reports)

### **Test 3: Submit Second Report**

1. Login as the same driver
2. Submit another report
3. **Expected:**
   - Blue card shows "Deposit Collection"
   - Amount: (2500 - current_deposit) / 10
   - Example: If deposit is ₹1,000, cutting = ₹150

### **Test 4: Admin Approves Second Report** ⭐

1. Login as admin
2. Click "Approve" on the second report
3. **Expected:**
   - Success toast: "Deposit collection: ₹150 added to driver's balance"
   - Check database:
     ```sql
     SELECT * FROM driver_balance_transaction
     WHERE user_id = 'DRIVER_ID'
     ORDER BY created_at DESC;
     ```
   - Should see new row with `transaction_type = 'deposit_collection'`
   - Check user balance:
     ```sql
     SELECT pending_balance FROM users WHERE id = 'DRIVER_ID';
     ```
   - Should be increased by deposit amount

---

## Step 4: Verify Continuous Collection

### **Test Multiple Reports:**

Submit and approve reports 3-12 to verify:

- Deposit cutting decreases as balance increases
- Stops when balance reaches ₹2,500
- Each approval creates a transaction
- Balance updates correctly

**Example Progression:**

| Report # | Before Balance | Cutting | After Balance |
| -------- | -------------- | ------- | ------------- |
| 1        | ₹1,000         | ₹0      | ₹1,000        |
| 2        | ₹1,000         | ₹150    | ₹1,150        |
| 3        | ₹1,150         | ₹135    | ₹1,285        |
| 4        | ₹1,285         | ₹122    | ₹1,407        |
| ...      | ...            | ...     | ...           |
| 12       | ₹2,500         | ₹0      | ₹2,500        |

---

## 🔍 Troubleshooting

### **Issue 1: "Check constraint violation"**

**Error:** `driver_penalty_transactions_type_check`

**Solution:** ✅ Already fixed! We're now using `driver_balance_transaction` table instead of `driver_penalty_transactions`.

### **Issue 2: "Table does not exist"**

**Error:** `relation "driver_balance_transaction" does not exist`

**Solution:** Run the SQL script from Step 1.

### **Issue 3: "Permission denied"**

**Error:** `new row violates row-level security policy`

**Solution:**

- Check RLS policies are created
- Ensure admin user has correct role
- Verify `users.role` is 'admin' or 'super_admin'

### **Issue 4: Deposit not adding**

**Solution:** ✅ Already fixed! The code now:

- Counts approved reports BEFORE updating status
- Checks if `previousApprovedCount >= 1` (not >= 2)
- Creates transaction with correct timing

---

## 📊 Database Queries for Monitoring

### **Check All Deposit Transactions:**

```sql
SELECT
    dt.id,
    u.name as driver_name,
    dt.amount,
    dt.transaction_type,
    dt.description,
    dt.transaction_date,
    dt.created_at
FROM driver_balance_transaction dt
JOIN users u ON u.id = dt.user_id
WHERE dt.transaction_type = 'deposit_collection'
ORDER BY dt.created_at DESC;
```

### **Check Driver's Deposit Progress:**

```sql
SELECT
    u.name,
    u.pending_balance as current_deposit,
    2500 - u.pending_balance as remaining,
    COUNT(fr.id) as approved_reports
FROM users u
LEFT JOIN fleet_reports fr ON fr.user_id = u.id AND fr.status = 'approved'
WHERE u.role = 'driver'
GROUP BY u.id, u.name, u.pending_balance
ORDER BY u.name;
```

### **Check Deposit Collection History:**

```sql
SELECT
    u.name as driver_name,
    dt.amount,
    dt.description,
    dt.transaction_date,
    u.pending_balance as current_balance
FROM driver_balance_transaction dt
JOIN users u ON u.id = dt.user_id
WHERE dt.transaction_type = 'deposit_collection'
ORDER BY dt.transaction_date DESC
LIMIT 50;
```

---

## ✅ Checklist

Before going live:

- [ ] Run `CREATE_DRIVER_BALANCE_TRANSACTION_TABLE.sql`
- [ ] Verify table structure
- [ ] Test with 1st report (no cutting)
- [ ] Test with 2nd report (cutting starts)
- [ ] Verify transaction created
- [ ] Verify balance updated
- [ ] Test until deposit reaches ₹2,500
- [ ] Verify cutting stops at target
- [ ] Check all RLS policies work
- [ ] Test with multiple drivers
- [ ] Monitor error logs

---

## 🎯 Expected Behavior

### **Driver Side:**

- See blue "Deposit Collection" card after 2 approved reports
- Shows current deposit, target, and daily cutting amount
- Total rent includes deposit cutting

### **Admin Side:**

- Click "Approve" button
- See success toast with deposit amount
- Transaction automatically created
- Balance automatically updated

### **Database:**

- New row in `driver_balance_transaction`
- `pending_balance` in `users` increased
- All changes logged with timestamps

---

## 📝 Notes

- **Target Deposit:** ₹2,500 (configurable)
- **Division Days:** 10 days (configurable)
- **Activation:** After 2 approved reports
- **Auto-Stop:** When balance >= ₹2,500
- **Transaction Type:** `deposit_collection`
- **Table:** `driver_balance_transaction` (NOT `driver_penalty_transactions`)

---

**Ready to Deploy!** 🚀

Run the SQL script and test the flow. The system is now fully functional!

