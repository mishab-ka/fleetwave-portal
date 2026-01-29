-- ============================================
-- SIMPLE FIX: Manager Can Insert Transactions
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- ============================================

-- Step 1: Enable RLS
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'driver_penalty_transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.driver_penalty_transactions', pol.policyname);
    END LOOP;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'driver_balance_transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.driver_balance_transactions', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Create INSERT policy for driver_penalty_transactions
-- This allows manager, accountant, and admin to INSERT
CREATE POLICY "manager_can_insert_penalty"
ON public.driver_penalty_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 4: Create SELECT policies for driver_penalty_transactions
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
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 5: Create UPDATE policy for driver_penalty_transactions
CREATE POLICY "update_staff_penalty"
ON public.driver_penalty_transactions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 6: Create DELETE policy (Admin only)
CREATE POLICY "delete_admin_penalty"
ON public.driver_penalty_transactions
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Step 7: Ensure driver_balance_transactions table exists
CREATE TABLE IF NOT EXISTS public.driver_balance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'refund', 'due', 'penalty', 'bonus')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- Step 8: Create INSERT policy for driver_balance_transactions
CREATE POLICY "manager_can_insert_balance"
ON public.driver_balance_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 9: Create SELECT policies for driver_balance_transactions
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
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 10: Create UPDATE policy for driver_balance_transactions
CREATE POLICY "update_staff_balance"
ON public.driver_balance_transactions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- Step 11: Create DELETE policy (Admin only)
CREATE POLICY "delete_admin_balance"
ON public.driver_balance_transactions
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Step 12: Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_user_id ON public.driver_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_type ON public.driver_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_created_at ON public.driver_balance_transactions(created_at);

-- Step 13: Check your role
SELECT 
    'Role Check' as check_type,
    id,
    email,
    role,
    CASE 
        WHEN role IN ('admin', 'super_admin', 'manager', 'accountant') 
        THEN '✅ Role is CORRECT - Can insert'
        ELSE '❌ Role is WRONG: ' || COALESCE(role, 'NULL') || ' - Update it below'
    END as status
FROM public.users 
WHERE id = auth.uid();

-- Step 14: Test insert permission
SELECT 
    'Permission Test' as test,
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    ) as can_insert,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'manager', 'accountant')
        )
        THEN '✅ SUCCESS - Manager CAN insert!'
        ELSE '❌ FAILED - Update role to manager below'
    END as result;

-- ============================================
-- IF can_insert = false, run this:
-- ============================================
-- UPDATE public.users 
-- SET role = 'manager' 
-- WHERE id = auth.uid();
-- ============================================

