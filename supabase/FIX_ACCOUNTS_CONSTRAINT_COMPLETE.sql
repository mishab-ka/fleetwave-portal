-- Complete Fix for Accounts Table Constraint Issue
-- This script handles existing data and fixes constraints properly

-- Step 1: Check what values currently exist in the accounts table
DO $$
DECLARE
    existing_types TEXT[];
    existing_balances TEXT[];
BEGIN
    -- Get all unique type values
    SELECT ARRAY_AGG(DISTINCT type) INTO existing_types FROM accounts;
    -- Get all unique normal_balance values
    SELECT ARRAY_AGG(DISTINCT normal_balance) INTO existing_balances FROM accounts;
    
    RAISE NOTICE 'Current type values: %', existing_types;
    RAISE NOTICE 'Current normal_balance values: %', existing_balances;
END $$;

-- Step 2: Update existing data to match the new constraint format
DO $$
BEGIN
    -- Update type values to match the new constraint
    UPDATE accounts SET type = 'Asset' WHERE type IN ('asset', 'ASSET');
    UPDATE accounts SET type = 'Liability' WHERE type IN ('liability', 'LIABILITY');
    UPDATE accounts SET type = 'Equity' WHERE type IN ('equity', 'EQUITY');
    UPDATE accounts SET type = 'Income' WHERE type IN ('income', 'INCOME');
    UPDATE accounts SET type = 'Expense' WHERE type IN ('expense', 'EXPENSE');
    
    -- Update normal_balance values to match the new constraint
    UPDATE accounts SET normal_balance = 'Debit' WHERE normal_balance IN ('debit', 'DEBIT');
    UPDATE accounts SET normal_balance = 'Credit' WHERE normal_balance IN ('credit', 'CREDIT');
    
    RAISE NOTICE 'Data updated to match new constraint format';
END $$;

-- Step 3: Drop existing constraints
DO $$
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
    ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_normal_balance_check;
    
    RAISE NOTICE 'Existing constraints dropped';
END $$;

-- Step 4: Add the correct constraints
DO $$
BEGIN
    -- Add correct constraints
    ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
    CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense'));
    
    ALTER TABLE accounts ADD CONSTRAINT accounts_normal_balance_check 
    CHECK (normal_balance IN ('Debit', 'Credit'));
    
    RAISE NOTICE 'New constraints added successfully';
END $$;

-- Step 5: Insert sample data only if accounts don't exist
DO $$
BEGIN
    -- Check if accounts already exist
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE account_code = '1000') THEN
        -- Insert basic Chart of Accounts
        INSERT INTO accounts (account_code, name, type, normal_balance, description) VALUES
        -- Assets
        ('1000', 'Current Assets', 'Asset', 'Debit', 'All current assets'),
        ('1100', 'Cash and Bank', 'Asset', 'Debit', 'Cash and bank balances'),
        ('1200', 'Accounts Receivable', 'Asset', 'Debit', 'Money owed by customers'),
        ('1300', 'Inventory', 'Asset', 'Debit', 'Vehicle parts and supplies'),
        ('1400', 'Prepaid Expenses', 'Asset', 'Debit', 'Prepaid insurance, rent, etc.'),
        ('1500', 'Fixed Assets', 'Asset', 'Debit', 'Vehicles and equipment'),
        ('1600', 'Accumulated Depreciation', 'Asset', 'Credit', 'Depreciation on fixed assets'),

        -- Liabilities
        ('2000', 'Current Liabilities', 'Liability', 'Credit', 'All current liabilities'),
        ('2100', 'Accounts Payable', 'Liability', 'Credit', 'Money owed to vendors'),
        ('2200', 'Accrued Expenses', 'Liability', 'Credit', 'Accrued salaries, taxes, etc.'),
        ('2300', 'Short-term Loans', 'Liability', 'Credit', 'Short-term borrowings'),

        -- Equity
        ('3000', 'Owner Equity', 'Equity', 'Credit', 'Owner capital and retained earnings'),
        ('3100', 'Capital', 'Equity', 'Credit', 'Owner capital contributions'),
        ('3200', 'Retained Earnings', 'Equity', 'Credit', 'Accumulated profits'),

        -- Income
        ('4000', 'Operating Income', 'Income', 'Credit', 'Revenue from operations'),
        ('4100', 'Freight Revenue', 'Income', 'Credit', 'Revenue from freight services'),
        ('4200', 'Other Income', 'Income', 'Credit', 'Other sources of income'),

        -- Expenses
        ('5000', 'Operating Expenses', 'Expense', 'Debit', 'All operating expenses'),
        ('5100', 'Fuel Expenses', 'Expense', 'Debit', 'Vehicle fuel costs'),
        ('5200', 'Maintenance Expenses', 'Expense', 'Debit', 'Vehicle maintenance costs'),
        ('5300', 'Insurance Expenses', 'Expense', 'Debit', 'Vehicle and business insurance'),
        ('5400', 'Salary Expenses', 'Expense', 'Debit', 'Employee salaries'),
        ('5500', 'Depreciation Expenses', 'Expense', 'Debit', 'Asset depreciation'),
        ('5600', 'Administrative Expenses', 'Expense', 'Debit', 'Office and admin costs');
        
        RAISE NOTICE 'Sample accounts inserted successfully';
    ELSE
        RAISE NOTICE 'Accounts already exist, skipping insertion';
    END IF;
END $$;

-- Step 6: Verify the fix
DO $$
DECLARE
    type_count INTEGER;
    balance_count INTEGER;
BEGIN
    -- Check if all types are valid
    SELECT COUNT(*) INTO type_count 
    FROM accounts 
    WHERE type NOT IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense');
    
    -- Check if all normal_balance values are valid
    SELECT COUNT(*) INTO balance_count 
    FROM accounts 
    WHERE normal_balance NOT IN ('Debit', 'Credit');
    
    IF type_count = 0 AND balance_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All accounts now have valid type and normal_balance values';
    ELSE
        RAISE NOTICE 'WARNING: % accounts have invalid type values, % accounts have invalid normal_balance values', type_count, balance_count;
    END IF;
END $$;

