-- ============================================
-- Fix: Deposit Management Transactions Not Showing
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check your role
SELECT 
    'Role Check' as step,
    id,
    email,
    role,
    CASE 
        WHEN role IN ('admin', 'super_admin', 'manager', 'accountant') 
        THEN '✅ Role is correct - Can view transactions'
        ELSE '❌ Role is wrong: ' || COALESCE(role, 'NULL')
    END as status
FROM public.users 
WHERE id = auth.uid();

-- Step 2: Check current SELECT policies
SELECT 
    'Current SELECT Policies' as check,
    policyname,
    qual as policy_condition
FROM pg_policies 
WHERE tablename = 'driver_balance_transactions'
AND schemaname = 'public'
AND cmd = 'SELECT';

-- Step 3: Drop ALL existing SELECT policies (comprehensive list)
DROP POLICY IF EXISTS "allow_select_balance" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "select_own_balance" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "select_staff_balance" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "balance_select" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "balance_select_policy" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "allow_select_all_balance" ON public.driver_balance_transactions;
DROP POLICY IF EXISTS "staff_can_select_all_balance" ON public.driver_balance_transactions;

-- List any remaining policies (for debugging)
SELECT 
    'Remaining Policies to Drop' as info,
    policyname
FROM pg_policies 
WHERE tablename = 'driver_balance_transactions'
AND schemaname = 'public'
AND cmd = 'SELECT';

-- Step 4: Create a single, comprehensive SELECT policy
-- This allows staff to see ALL transactions for any driver
-- Using same policy name as migration for consistency
CREATE POLICY "allow_select_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (
    -- Condition 1: Users can see their own transactions
    auth.uid() = user_id
    OR
    -- Condition 2: Staff can see ALL transactions (for any driver)
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 5: Verify the policy was created
SELECT 
    'Policy Verification' as check,
    policyname,
    cmd as command,
    '✅ Policy created' as status
FROM pg_policies 
WHERE tablename = 'driver_balance_transactions'
AND schemaname = 'public'
AND cmd = 'SELECT';

-- Step 6: Test SELECT permission
SELECT 
    'Permission Test' as test,
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    ) as can_view_all_transactions,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'manager', 'accountant')
        )
        THEN '✅ You can view all deposit transactions'
        ELSE '❌ You can only view your own transactions - Update role to manager/accountant/admin'
    END as result;

-- Step 7: Check transaction count (to verify data exists)
SELECT 
    'Data Check' as info,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT user_id) as unique_drivers
FROM public.driver_balance_transactions;

