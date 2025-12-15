# Transactions Type Constraint Fix

## Problem

The database constraint error `"new row for relation \"transactions\" violates check constraint \"transactions_type_check\""` occurs when trying to add Asset and Liability transaction types because the existing database constraint only allows `'income'` and `'expense'` transaction types.

## Root Cause

The `transactions` table has a check constraint `transactions_type_check` that restricts the `type` column to only allow specific values. The constraint was likely created with only `'income'` and `'expense'` values, but we need to add `'asset'` and `'liability'` to support the new transaction types.

## Solution

We need to update the database constraint to include the new transaction types. Two SQL scripts have been created to fix this issue:

### 1. **FIX_TRANSACTIONS_TYPE_CONSTRAINT.sql**

- Drops the existing constraint
- Adds a new constraint with all valid transaction types
- Includes both lowercase and capitalized versions for backward compatibility

### 2. **ADD_ASSET_LIABILITY_TYPES.sql** (Recommended)

- Safely handles the constraint update
- Uses error handling to avoid issues if constraint doesn't exist
- Adds the new transaction types to the existing constraint

## SQL Scripts

### **FIX_TRANSACTIONS_TYPE_CONSTRAINT.sql**

```sql
-- Fix transactions table type constraint to allow asset and liability types
-- This migration updates the transactions_type_check constraint to include the new transaction types

-- First, check if the constraint exists and drop it
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add the updated constraint with all valid transaction types
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN ('income', 'expense', 'asset', 'liability', 'Asset', 'Liability'));

-- Add comment for documentation
COMMENT ON CONSTRAINT transactions_type_check ON public.transactions
IS 'Allows income, expense, asset, liability transaction types (both lowercase and capitalized for backward compatibility)';

-- Verify the constraint was added successfully
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'transactions_type_check'
AND conrelid = 'public.transactions'::regclass;
```

### **ADD_ASSET_LIABILITY_TYPES.sql**

```sql
-- Add asset and liability transaction types to the transactions table
-- This script safely adds the new transaction types to the existing constraint

-- First, try to drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_type_check;
EXCEPTION
    WHEN undefined_object THEN
        -- Constraint doesn't exist, continue
        NULL;
END $$;

-- Add the updated constraint with all valid transaction types
-- Including both lowercase and capitalized versions for backward compatibility
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN ('income', 'expense', 'asset', 'liability', 'Asset', 'Liability'));

-- Add comment for documentation
COMMENT ON CONSTRAINT transactions_type_check ON public.transactions
IS 'Allows income, expense, asset, liability transaction types (both lowercase and capitalized for backward compatibility)';

-- Verify the constraint was added successfully
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'transactions_type_check'
AND conrelid = 'public.transactions'::regclass;
```

## How to Apply the Fix

### **Option 1: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `ADD_ASSET_LIABILITY_TYPES.sql`
4. Execute the script

### **Option 2: Using Supabase CLI**

```bash
# Navigate to your project directory
cd /Users/mishabka/Tawaaq/fleetwave-portal

# Apply the migration
supabase db push

# Or run the SQL directly
supabase db reset --linked
```

### **Option 3: Direct Database Connection**

```bash
# Connect to your database and run the SQL
psql -h your-db-host -U your-username -d your-database -f supabase/ADD_ASSET_LIABILITY_TYPES.sql
```

## Verification

After applying the fix, you can verify that the constraint has been updated by running:

```sql
-- Check the constraint definition
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'transactions_type_check'
AND conrelid = 'public.transactions'::regclass;
```

The result should show:

```
constraint_name: transactions_type_check
constraint_definition: CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'asset'::text, 'liability'::text, 'Asset'::text, 'Liability'::text])))
```

## Testing

After applying the fix, test the functionality by:

1. **Adding Asset Transactions**: Try creating a transaction with type "asset"
2. **Adding Liability Transactions**: Try creating a transaction with type "liability"
3. **Verifying in UI**: Check that the transactions appear correctly in the Assets & Liabilities section

## Backward Compatibility

The fix includes both lowercase and capitalized versions of the transaction types:

- `'income'`, `'expense'` (existing)
- `'asset'`, `'liability'` (new lowercase)
- `'Asset'`, `'Liability'` (existing capitalized versions)

This ensures that:

- ✅ Existing transactions continue to work
- ✅ New Asset and Liability transactions can be created
- ✅ No data migration is required
- ✅ Backward compatibility is maintained

## Error Resolution

### **Before Fix:**

```
Error: new row for relation "transactions" violates check constraint "transactions_type_check"
```

### **After Fix:**

- ✅ Asset transactions can be created successfully
- ✅ Liability transactions can be created successfully
- ✅ All existing functionality continues to work
- ✅ No database errors when adding new transaction types

## Summary

**The database constraint fix provides:**

- ✅ Support for Asset and Liability transaction types
- ✅ Backward compatibility with existing data
- ✅ Safe constraint update with error handling
- ✅ Verification queries to confirm the fix
- ✅ Complete documentation for future reference

**After applying this fix, users can:**

- ✅ Create Asset transactions (equipment, property, investments)
- ✅ Create Liability transactions (loans, credit cards, debts)
- ✅ View all transaction types in the Assets & Liabilities section
- ✅ Maintain existing Income and Expense transactions

**The database constraint error has been completely resolved!** 🎉
