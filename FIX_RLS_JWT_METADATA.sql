-- ============================================
-- FIX RLS FOR JWT METADATA ROLE STORAGE
-- Role is stored in JWT metadata
-- Admin, Manager, Accountant can INSERT
-- Only Admin can DELETE
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on both tables
-- ============================================

ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop all existing policies
-- ============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop policies for driver_penalty_transactions
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'driver_penalty_transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.driver_penalty_transactions', pol.policyname);
    END LOOP;
    
    -- Drop policies for driver_balance_transactions
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'driver_balance_transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.driver_balance_transactions', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 3: driver_penalty_transactions Policies
-- ============================================

-- INSERT: Allow Admin, Manager, Accountant
-- Try both JWT locations (role directly and in user_metadata)
CREATE POLICY "insert_admin_manager_accountant_penalty"
ON public.driver_penalty_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    -- Check if role is in JWT directly
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check if role is in user_metadata
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check if role is in app_metadata
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- SELECT: Allow users to see their own, staff to see all
CREATE POLICY "select_own_penalty"
ON public.driver_penalty_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "select_all_staff_penalty"
ON public.driver_penalty_transactions
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- UPDATE: Allow Admin, Manager, Accountant
CREATE POLICY "update_admin_manager_accountant_penalty"
ON public.driver_penalty_transactions
FOR UPDATE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
)
WITH CHECK (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- DELETE: Only Admin
CREATE POLICY "delete_only_admin_penalty"
ON public.driver_penalty_transactions
FOR DELETE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
);

-- ============================================
-- STEP 4: driver_balance_transactions Policies
-- ============================================

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.driver_balance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'refund', 'due', 'penalty', 'bonus')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- INSERT: Allow Admin, Manager, Accountant
CREATE POLICY "insert_admin_manager_accountant_balance"
ON public.driver_balance_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- SELECT: Allow users to see their own, staff to see all
CREATE POLICY "select_own_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "select_all_staff_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- UPDATE: Allow Admin, Manager, Accountant
CREATE POLICY "update_admin_manager_accountant_balance"
ON public.driver_balance_transactions
FOR UPDATE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
)
WITH CHECK (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- DELETE: Only Admin
CREATE POLICY "delete_only_admin_balance"
ON public.driver_balance_transactions
FOR DELETE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_user_id 
ON public.driver_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_type 
ON public.driver_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_created_at 
ON public.driver_balance_transactions(created_at);

-- ============================================
-- STEP 5: Verify policies and check JWT role
-- ============================================

-- Show all policies created
SELECT 
    'Policies Created' as info,
    tablename,
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
AND schemaname = 'public'
ORDER BY tablename, cmd;

-- Check where role is in JWT
SELECT 
    'JWT Role Check' as check_type,
    auth.jwt() ->> 'role' as jwt_role_direct,
    auth.jwt() -> 'user_metadata' ->> 'role' as jwt_user_metadata_role,
    auth.jwt() -> 'app_metadata' ->> 'role' as jwt_app_metadata_role,
    CASE 
        WHEN auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant') 
        THEN '✅ Role found in JWT directly'
        WHEN auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant')
        THEN '✅ Role found in user_metadata'
        WHEN auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant')
        THEN '✅ Role found in app_metadata'
        ELSE '❌ Role NOT found in JWT - Check your JWT setup'
    END as status;

-- Test insert permission
SELECT 
    'Insert Permission Test' as test,
    CASE 
        WHEN (
            (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
            OR
            (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
            OR
            (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
        )
        THEN '✅ CAN INSERT - Policy will work!'
        ELSE '❌ CANNOT INSERT - Role not found in JWT'
    END as result;

