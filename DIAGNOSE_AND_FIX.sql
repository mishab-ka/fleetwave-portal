-- ============================================
-- DIAGNOSE AND FIX 42501 ERROR
-- Run this to see what's wrong and fix it
-- ============================================

-- STEP 1: Check your current role
SELECT 
    'DIAGNOSIS: Your Role' as step,
    id,
    email,
    role,
    CASE 
        WHEN role = 'manager' THEN '✅ Manager - Role is CORRECT'
        WHEN role = 'accountant' THEN '✅ Accountant - Role is CORRECT'
        WHEN role IN ('admin', 'super_admin') THEN '✅ Admin - Role is CORRECT'
        WHEN role IS NULL THEN '❌ Role is NULL - Must set to manager'
        ELSE '❌ Role is WRONG: "' || role || '" - Must be manager/accountant/admin'
    END as diagnosis
FROM public.users 
WHERE id = auth.uid();

-- STEP 2: Check if INSERT policies exist
SELECT 
    'DIAGNOSIS: Existing Policies' as step,
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN cmd = 'INSERT' THEN '✅ INSERT policy exists'
        ELSE 'Other policy'
    END as status
FROM pg_policies 
WHERE tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
AND schemaname = 'public'
AND cmd = 'INSERT';

-- STEP 3: Fix role if it's wrong (uncomment if needed)
-- UPDATE public.users SET role = 'manager' WHERE id = auth.uid();

-- STEP 4: Drop ALL existing policies
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

-- STEP 5: Enable RLS
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create INSERT policy for driver_penalty_transactions
CREATE POLICY "fix_insert_penalty"
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

-- STEP 7: Create SELECT policy for driver_penalty_transactions
CREATE POLICY "fix_select_penalty"
ON public.driver_penalty_transactions
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- STEP 8: Create UPDATE policy for driver_penalty_transactions
CREATE POLICY "fix_update_penalty"
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

-- STEP 9: Create DELETE policy (Admin only)
CREATE POLICY "fix_delete_penalty"
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

-- STEP 10: Ensure driver_balance_transactions table exists
CREATE TABLE IF NOT EXISTS public.driver_balance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'refund', 'due', 'penalty', 'bonus')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- STEP 11: Create INSERT policy for driver_balance_transactions
CREATE POLICY "fix_insert_balance"
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

-- STEP 12: Create SELECT policy for driver_balance_transactions
CREATE POLICY "fix_select_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- STEP 13: Create UPDATE policy for driver_balance_transactions
CREATE POLICY "fix_update_balance"
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

-- STEP 14: Create DELETE policy (Admin only)
CREATE POLICY "fix_delete_balance"
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

-- STEP 15: Final verification
SELECT 
    'FINAL TEST' as step,
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
        THEN '✅ SUCCESS - Policies created! Refresh browser and try again.'
        ELSE '❌ FAILED - Your role is wrong. Run: UPDATE public.users SET role = ''manager'' WHERE id = auth.uid();'
    END as result;

