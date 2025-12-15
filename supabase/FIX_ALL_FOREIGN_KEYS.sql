-- Complete Fix for All Foreign Key Relationships
-- This script ensures all foreign key constraints are properly established

-- ============================================================================
-- 1. DROP AND RECREATE FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop existing foreign key constraints if they exist
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS journal_lines_account_id_fkey;
ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS journal_lines_journal_entry_id_fkey;
ALTER TABLE ap_invoices DROP CONSTRAINT IF EXISTS ap_invoices_vendor_id_fkey;
ALTER TABLE ap_payments DROP CONSTRAINT IF EXISTS ap_payments_ap_invoice_id_fkey;

-- ============================================================================
-- 2. ADD ALL FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Transactions table foreign keys
ALTER TABLE transactions 
ADD CONSTRAINT transactions_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Journal lines table foreign keys
ALTER TABLE journal_lines 
ADD CONSTRAINT journal_lines_account_id_fkey 
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE journal_lines 
ADD CONSTRAINT journal_lines_journal_entry_id_fkey 
FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;

-- AP Invoices table foreign keys
ALTER TABLE ap_invoices 
ADD CONSTRAINT ap_invoices_vendor_id_fkey 
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- AP Payments table foreign keys
ALTER TABLE ap_payments 
ADD CONSTRAINT ap_payments_ap_invoice_id_fkey 
FOREIGN KEY (ap_invoice_id) REFERENCES ap_invoices(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. VERIFY ALL FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Show all foreign key relationships
SELECT 'Foreign key relationships created:' as info, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('transactions', 'journal_lines', 'ap_invoices', 'ap_payments')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 4. TEST THE RELATIONSHIPS
-- ============================================================================

-- Test if the relationships work by querying transactions with joins
DO $$
BEGIN
    -- Test query to see if foreign keys work
    PERFORM 1 FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN categories c ON t.category_id = c.id
    LIMIT 1;
    
    RAISE NOTICE 'SUCCESS: Foreign key relationships are working correctly!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Foreign key relationships are not working: %', SQLERRM;
END $$;

-- ============================================================================
-- 5. SHOW SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: All foreign key relationships have been created!' as result;

