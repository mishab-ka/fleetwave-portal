-- Quick Fix for Accounts Constraint
-- Run this to fix the constraint issue immediately

-- Step 1: Drop the existing constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Step 2: Add the correct constraint
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense'));

-- Step 3: Also fix normal_balance constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_normal_balance_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_normal_balance_check 
CHECK (normal_balance IN ('Debit', 'Credit'));

-- Step 4: Show success message
SELECT 'SUCCESS: Constraints have been fixed!' as result;

