# Fix Transactions Amount Constraint Error

## Problem

The error `"new row for relation \"transactions\" violates check constraint \"transactions_amount_check\""` occurs when trying to add transactions because the database has a constraint that prevents certain amount values.

## Root Cause

The `transactions` table has a check constraint `transactions_amount_check` that likely requires amounts to be positive (greater than 0), but we need to allow negative amounts for expenses and liability transactions.

## Solution

Run the SQL script `supabase/FIX_TRANSACTIONS_AMOUNT_CONSTRAINT.sql` in your Supabase SQL editor to fix this constraint.

### Manual Fix Steps:

1. **Open Supabase Dashboard**

   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Fix Script**

   - Copy and paste the contents of `supabase/FIX_TRANSACTIONS_AMOUNT_CONSTRAINT.sql`
   - Execute the script

3. **Verify the Fix**
   - The script will show you the current constraints
   - It will remove the problematic constraint
   - It will add a new constraint that allows both positive and negative amounts but prevents zero amounts

### What the Script Does:

1. **Shows Current Constraints** - Displays all check constraints on the transactions table
2. **Removes Problematic Constraints** - Drops `transactions_amount_check` and related constraints
3. **Adds New Constraint** - Creates a constraint that prevents zero amounts but allows positive and negative amounts
4. **Verifies Success** - Shows the new constraint definition

### Expected Result:

After running the script, you should be able to:

- ✅ Add income transactions (positive amounts)
- ✅ Add expense transactions (negative amounts)
- ✅ Add asset transactions (positive or negative amounts)
- ✅ Add liability transactions (positive or negative amounts)
- ❌ Cannot add transactions with zero amounts (prevented by new constraint)

## Alternative Quick Fix

If you can't access the SQL editor, you can also run this single command:

```sql
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_check CHECK (amount != 0);
```

This will immediately fix the constraint issue and allow both positive and negative transaction amounts.
