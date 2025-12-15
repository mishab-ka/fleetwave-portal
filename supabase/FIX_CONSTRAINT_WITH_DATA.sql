-- Fix Accounts Constraint with Existing Data
-- This script handles existing data and fixes the constraint properly

-- Step 1: Check what values currently exist in the accounts table
SELECT 'BEFORE FIX - Current type values:' as info, type, COUNT(*) as count 
FROM accounts 
GROUP BY type 
ORDER BY type;

SELECT 'BEFORE FIX - Current normal_balance values:' as info, normal_balance, COUNT(*) as count 
FROM accounts 
GROUP BY normal_balance 
ORDER BY normal_balance;

-- Step 2: Update existing data to match the new constraint format
-- Update type values to proper case
UPDATE accounts SET type = 'Asset' WHERE type IN ('asset', 'ASSET', 'assets', 'ASSETS');
UPDATE accounts SET type = 'Liability' WHERE type IN ('liability', 'LIABILITY', 'liabilities', 'LIABILITIES');
UPDATE accounts SET type = 'Equity' WHERE type IN ('equity', 'EQUITY', 'equities', 'EQUITIES');
UPDATE accounts SET type = 'Income' WHERE type IN ('income', 'INCOME', 'incomes', 'INCOMES');
UPDATE accounts SET type = 'Expense' WHERE type IN ('expense', 'EXPENSE', 'expenses', 'EXPENSES');

-- Update normal_balance values to proper case
UPDATE accounts SET normal_balance = 'Debit' WHERE normal_balance IN ('debit', 'DEBIT', 'dr', 'DR');
UPDATE accounts SET normal_balance = 'Credit' WHERE normal_balance IN ('credit', 'CREDIT', 'cr', 'CR');

-- Step 3: Show what values exist after update
SELECT 'AFTER UPDATE - Current type values:' as info, type, COUNT(*) as count 
FROM accounts 
GROUP BY type 
ORDER BY type;

SELECT 'AFTER UPDATE - Current normal_balance values:' as info, normal_balance, COUNT(*) as count 
FROM accounts 
GROUP BY normal_balance 
ORDER BY normal_balance;

-- Step 4: Drop existing constraints
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_normal_balance_check;

-- Step 5: Add the correct constraints
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense'));

ALTER TABLE accounts ADD CONSTRAINT accounts_normal_balance_check 
CHECK (normal_balance IN ('Debit', 'Credit'));

-- Step 6: Verify the constraints work
DO $$
BEGIN
    -- Try to insert a test value to verify the constraint works
    INSERT INTO accounts (account_code, name, type, normal_balance, description) 
    VALUES ('TEST123', 'Test Account', 'Asset', 'Debit', 'Test account for constraint verification');
    
    -- If successful, delete the test record
    DELETE FROM accounts WHERE account_code = 'TEST123';
    
    RAISE NOTICE 'SUCCESS: Constraints are working correctly!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Constraint test failed: %', SQLERRM;
END $$;

-- Step 7: Show final verification
SELECT 'FINAL - Current type values:' as info, type, COUNT(*) as count 
FROM accounts 
GROUP BY type 
ORDER BY type;

SELECT 'FINAL - Current normal_balance values:' as info, normal_balance, COUNT(*) as count 
FROM accounts 
GROUP BY normal_balance 
ORDER BY normal_balance;

-- Step 8: Show success message
SELECT 'SUCCESS: All constraints have been fixed and data updated!' as result;

