-- ============================================
-- SIMPLE FIX FOR 42501 ERROR
-- Copy and run this ENTIRE file in Supabase SQL Editor
-- 
-- NOTE: This file is for manual execution. 
-- For migrations, use: supabase/migrations/20250131000000_fix_transaction_insert_permissions.sql
-- ============================================

-- Step 1: Check your role
SELECT 
    'Your Role' as check,
    id,
    email,
    role,
    CASE 
        WHEN role IN ('admin', 'super_admin', 'manager', 'accountant') 
        THEN '✅ Role is CORRECT'
        ELSE '❌ Role is WRONG: ' || COALESCE(role, 'NULL') || ' - Fix it below'
    END as status
FROM public.users 
WHERE id = auth.uid();

-- Step 2: Fix role if wrong (uncomment and run if needed)
-- UPDATE public.users SET role = 'manager' WHERE id = auth.uid();

-- Step 3: Remove ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Step 4: Enable RLS
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create INSERT policy for driver_penalty_transactions
-- This allows manager, accountant, and admin to INSERT
CREATE POLICY "allow_insert_penalty"
ON public.driver_penalty_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 6: Create SELECT policy for driver_penalty_transactions
CREATE POLICY "allow_select_penalty"
ON public.driver_penalty_transactions
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 7: Create UPDATE policy for driver_penalty_transactions
CREATE POLICY "allow_update_penalty"
ON public.driver_penalty_transactions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 8: Create DELETE policy (Admin only)
CREATE POLICY "allow_delete_penalty"
ON public.driver_penalty_transactions
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Step 9: Ensure driver_balance_transactions table exists
CREATE TABLE IF NOT EXISTS public.driver_balance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'refund', 'due', 'penalty', 'bonus')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- Step 10: Create INSERT policy for driver_balance_transactions
CREATE POLICY "allow_insert_balance"
ON public.driver_balance_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 11: Create SELECT policy for driver_balance_transactions
CREATE POLICY "allow_select_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 12: Create UPDATE policy for driver_balance_transactions
CREATE POLICY "allow_update_balance"
ON public.driver_balance_transactions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 13: Create DELETE policy (Admin only)
CREATE POLICY "allow_delete_balance"
ON public.driver_balance_transactions
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Step 14: Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_user_id 
ON public.driver_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_type 
ON public.driver_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_created_at 
ON public.driver_balance_transactions(created_at);

-- Step 15: Final test - Check if you can insert
SELECT 
    'Final Test' as test,
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    ) as can_insert,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'manager', 'accountant')
        )
        THEN '✅ SUCCESS - You can now add transactions! Refresh browser and try.'
        ELSE '❌ FAILED - Your role is wrong. Run: UPDATE public.users SET role = ''manager'' WHERE id = auth.uid();'
    END as result;

-- Step 16: Show all policies created
SELECT 
    'Policies Created' as info,
    tablename,
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
AND schemaname = 'public'
ORDER BY tablename, cmd;

