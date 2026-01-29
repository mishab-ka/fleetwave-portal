-- ============================================
-- Fix: Deposit Management Transactions Not Showing
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check current policies
SELECT 
    'Current Policies' as check,
    tablename,
    policyname,
    cmd as command,
    qual as using_clause
FROM pg_policies 
WHERE tablename = 'driver_balance_transactions'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Step 2: Drop existing SELECT policies for driver_balance_transactions
DROP POLICY IF EXISTS "allow_select_balance" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "select_own_balance" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "select_staff_balance" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "balance_select" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "balance_select_policy" ON public.driver_balance_transactions;

-- Step 3: Create a single comprehensive SELECT policy
-- This allows staff to see ALL transactions (not just their own)
CREATE POLICY "allow_select_all_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (
    -- Users can see their own transactions
    auth.uid() = user_id
    OR
    -- Staff (admin, manager, accountant) can see ALL transactions
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 4: Verify the policy was created
SELECT 
    'Policy Created' as status,
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename = 'driver_balance_transactions'
AND schemaname = 'public'
AND cmd = 'SELECT';

-- Step 5: Test if you can select transactions
-- This should return true if you're a manager/accountant/admin
SELECT 
    'Permission Test' as test,
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    ) as can_select_all_transactions,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'manager', 'accountant')
        )
        THEN '✅ You can view all transactions'
        ELSE '❌ You can only view your own transactions'
    END as result;

-- Step 6: Check if there are any transactions in the table
SELECT 
    'Transaction Count' as info,
    COUNT(*) as total_transactions
FROM public.driver_balance_transactions;

