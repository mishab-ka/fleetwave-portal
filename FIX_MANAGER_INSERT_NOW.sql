-- ============================================
-- SIMPLE FIX: Allow Manager to Insert
-- Copy and run this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Check your role first
SELECT 
    'Check Role' as step,
    id,
    email,
    role,
    CASE 
        WHEN role = 'manager' THEN '✅ Manager - Good!'
        WHEN role = 'accountant' THEN '✅ Accountant - Good!'
        WHEN role IN ('admin', 'super_admin') THEN '✅ Admin - Good!'
        ELSE '❌ WRONG: ' || COALESCE(role, 'NULL') || ' - Fix below'
    END as status
FROM public.users 
WHERE id = auth.uid();

-- Step 2: Fix role if wrong (uncomment and run if needed)
-- UPDATE public.users SET role = 'manager' WHERE id = auth.uid();

-- Step 3: Remove ALL policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Step 4: Enable RLS
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: INSERT policy for driver_penalty_transactions
CREATE POLICY "manager_insert_penalty"
ON public.driver_penalty_transactions FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- Step 6: SELECT policy for driver_penalty_transactions
CREATE POLICY "select_penalty"
ON public.driver_penalty_transactions FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- Step 7: UPDATE policy for driver_penalty_transactions
CREATE POLICY "update_penalty"
ON public.driver_penalty_transactions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')));

-- Step 8: DELETE policy (Admin only)
CREATE POLICY "delete_penalty"
ON public.driver_penalty_transactions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

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

-- Step 10: INSERT policy for driver_balance_transactions
CREATE POLICY "manager_insert_balance"
ON public.driver_balance_transactions FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- Step 11: SELECT policy for driver_balance_transactions
CREATE POLICY "select_balance"
ON public.driver_balance_transactions FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- Step 12: UPDATE policy for driver_balance_transactions
CREATE POLICY "update_balance"
ON public.driver_balance_transactions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')));

-- Step 13: DELETE policy (Admin only)
CREATE POLICY "delete_balance"
ON public.driver_balance_transactions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Step 14: Final test
SELECT 
    'Test Result' as step,
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')) as can_insert,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
        THEN '✅ FIXED - Manager can now insert! Refresh browser and try.'
        ELSE '❌ Role issue - Run: UPDATE public.users SET role = ''manager'' WHERE id = auth.uid();'
    END as result;

