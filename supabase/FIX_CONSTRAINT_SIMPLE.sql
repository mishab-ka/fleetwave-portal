-- Simple Fix for Accounts Constraint Issue
-- This script fixes the constraint by updating existing data first

-- Step 1: Update existing data to match the new constraint format
UPDATE accounts SET type = 'Asset' WHERE type IN ('asset', 'ASSET', 'assets', 'ASSETS');
UPDATE accounts SET type = 'Liability' WHERE type IN ('liability', 'LIABILITY', 'liabilities', 'LIABILITIES');
UPDATE accounts SET type = 'Equity' WHERE type IN ('equity', 'EQUITY', 'equities', 'EQUITIES');
UPDATE accounts SET type = 'Income' WHERE type IN ('income', 'INCOME', 'incomes', 'INCOMES');
UPDATE accounts SET type = 'Expense' WHERE type IN ('expense', 'EXPENSE', 'expenses', 'EXPENSES');

UPDATE accounts SET normal_balance = 'Debit' WHERE normal_balance IN ('debit', 'DEBIT', 'dr', 'DR');
UPDATE accounts SET normal_balance = 'Credit' WHERE normal_balance IN ('credit', 'CREDIT', 'cr', 'CR');

-- Step 2: Drop existing constraints
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_normal_balance_check;

-- Step 3: Add the correct constraints
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense'));

ALTER TABLE accounts ADD CONSTRAINT accounts_normal_balance_check 
CHECK (normal_balance IN ('Debit', 'Credit'));

-- Step 4: Show success message
SELECT 'SUCCESS: Constraints have been fixed!' as result;