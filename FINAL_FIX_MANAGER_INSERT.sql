-- ============================================
-- FINAL FIX: Allow Manager to Insert Transactions
-- This works for BOTH JWT metadata AND users table
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Enable RLS
-- ============================================

ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Remove ALL existing policies
-- ============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Remove from driver_penalty_transactions
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'driver_penalty_transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.driver_penalty_transactions', pol.policyname);
    END LOOP;
    
    -- Remove from driver_balance_transactions
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
-- STEP 3: driver_penalty_transactions - INSERT Policy
-- Checks BOTH JWT and users table
-- ============================================

CREATE POLICY "allow_insert_manager_admin_accountant_penalty"
ON public.driver_penalty_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    -- Check JWT directly
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check JWT user_metadata
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check JWT app_metadata
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check users table (fallback)
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- SELECT policies
CREATE POLICY "select_own_penalty"
ON public.driver_penalty_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "select_staff_penalty"
ON public.driver_penalty_transactions
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- UPDATE policy
CREATE POLICY "update_staff_penalty"
ON public.driver_penalty_transactions
FOR UPDATE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
)
WITH CHECK (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- DELETE policy (Admin only)
CREATE POLICY "delete_admin_penalty"
ON public.driver_penalty_transactions
FOR DELETE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    )
);

-- ============================================
-- STEP 4: driver_balance_transactions - INSERT Policy
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

CREATE POLICY "allow_insert_manager_admin_accountant_balance"
ON public.driver_balance_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    -- Check JWT directly
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check JWT user_metadata
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check JWT app_metadata
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    -- Check users table (fallback)
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- SELECT policies
CREATE POLICY "select_own_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "select_staff_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- UPDATE policy
CREATE POLICY "update_staff_balance"
ON public.driver_balance_transactions
FOR UPDATE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
)
WITH CHECK (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager', 'accountant'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- DELETE policy (Admin only)
CREATE POLICY "delete_admin_balance"
ON public.driver_balance_transactions
FOR DELETE
TO authenticated
USING (
    (auth.jwt() ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'super_admin'))
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin'))
    OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_user_id 
ON public.driver_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_type 
ON public.driver_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_created_at 
ON public.driver_balance_transactions(created_at);

-- ============================================
-- STEP 5: Verify and Test
-- ============================================

-- Show all policies
SELECT 
    'Policies Created' as info,
    tablename,
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
AND schemaname = 'public'
AND cmd = 'INSERT'
ORDER BY tablename;

-- Check role in users table
SELECT 
    'Users Table Check' as check_type,
    id,
    email,
    role,
    CASE 
        WHEN role IN ('admin', 'super_admin', 'manager', 'accountant') 
        THEN '✅ Role is correct - Can insert'
        ELSE '❌ Role is wrong: ' || COALESCE(role, 'NULL') || ' - Update below'
    END as status
FROM public.users 
WHERE id = auth.uid();

-- Check JWT role
SELECT 
    'JWT Role Check' as check_type,
    auth.jwt() ->> 'role' as jwt_direct,
    auth.jwt() -> 'user_metadata' ->> 'role' as jwt_user_metadata,
    auth.jwt() -> 'app_metadata' ->> 'role' as jwt_app_metadata;

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
            OR
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'super_admin', 'manager', 'accountant')
            )
        )
        THEN '✅ SUCCESS - Manager CAN insert transactions!'
        ELSE '❌ FAILED - Check role in users table'
    END as result;

-- ============================================
-- STEP 6: If role is wrong, update it:
-- ============================================
-- UPDATE public.users 
-- SET role = 'manager' 
-- WHERE id = auth.uid();
-- ============================================

