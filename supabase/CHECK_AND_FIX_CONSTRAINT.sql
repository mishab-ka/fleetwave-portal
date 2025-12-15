-- Check and Fix Accounts Constraint Issue
-- This script will check the current constraint and fix it

-- Step 1: Check what constraint currently exists
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'accounts'::regclass 
AND conname LIKE '%type%';

-- Step 2: Check what values are currently in the table
SELECT 'Current type values:' as info, type, COUNT(*) as count 
FROM accounts 
GROUP BY type 
ORDER BY type;

-- Step 3: Drop the existing constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

-- Step 4: Add the correct constraint
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense'));

-- Step 5: Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'accounts'::regclass 
AND conname LIKE '%type%';

-- Step 6: Test the constraint by trying to insert a test value
DO $$
BEGIN
    -- Try to insert a test value to see if the constraint works
    INSERT INTO accounts (account_code, name, type, normal_balance, description) 
    VALUES ('TEST', 'Test Account', 'Asset', 'Debit', 'Test account for constraint verification');
    
    -- If successful, delete the test record
    DELETE FROM accounts WHERE account_code = 'TEST';
    
    RAISE NOTICE 'SUCCESS: Constraint is working correctly!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Constraint is still not working: %', SQLERRM;
END $$;

