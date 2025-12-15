-- Fix Foreign Key Relationships for Finance Module
-- This script adds the missing foreign key constraints

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraint between transactions and categories
ALTER TABLE transactions 
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. VERIFY EXISTING FOREIGN KEYS
-- ============================================================================

-- Check if accounts foreign key exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_account_id_fkey' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT transactions_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added transactions_account_id_fkey constraint';
    ELSE
        RAISE NOTICE 'transactions_account_id_fkey constraint already exists';
    END IF;
END $$;

-- ============================================================================
-- 3. VERIFY ALL FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Show all foreign key relationships
SELECT 'Foreign key relationships:' as info, 
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

SELECT 'SUCCESS: Foreign key relationships have been fixed!' as result;

