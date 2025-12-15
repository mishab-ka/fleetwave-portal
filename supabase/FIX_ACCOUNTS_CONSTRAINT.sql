-- Fix Accounts Table Constraint
-- This script fixes the type constraint issue in the accounts table

-- First, let's check what the current constraint is
-- Then we'll drop it and recreate it with the correct values

-- Drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop the existing type constraint
    ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
    
    -- Add the correct constraint
    ALTER TABLE accounts ADD CONSTRAINT accounts_type_check 
    CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense'));
    
    -- Also ensure normal_balance constraint is correct
    ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_normal_balance_check;
    ALTER TABLE accounts ADD CONSTRAINT accounts_normal_balance_check 
    CHECK (normal_balance IN ('Debit', 'Credit'));
    
    RAISE NOTICE 'Constraints updated successfully';
END $$;

-- Now let's insert the sample data
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

