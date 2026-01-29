-- ============================================
-- COMPLETE 403 (42501) FIX SCRIPT
-- ============================================

-- STEP 1: Enable RLS
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop existing policies safely
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('driver_penalty_transactions','driver_balance_transactions')
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            pol.policyname,
            pol.tablename
        );
    END LOOP;
END $$;

-- ============================================
-- DRIVER PENALTY TRANSACTIONS POLICIES
-- ============================================

-- INSERT (Admin, Manager, Accountant)
CREATE POLICY "penalty_insert_staff"
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

-- SELECT (Drivers can see their own, staff can see all)
CREATE POLICY "penalty_select_policy"
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

-- UPDATE (Staff only)
CREATE POLICY "penalty_update_staff"
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

-- DELETE (Admin only)
CREATE POLICY "penalty_delete_admin"
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

-- ============================================
-- DRIVER BALANCE TRANSACTIONS POLICIES
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

-- INSERT (Admin, Manager, Accountant)
CREATE POLICY "balance_insert_staff"
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

-- SELECT
CREATE POLICY "balance_select_policy"
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

-- UPDATE (Staff)
CREATE POLICY "balance_update_staff"
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

-- DELETE (Admin only)
CREATE POLICY "balance_delete_admin"
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

-- ============================================
-- FINAL TEST
-- ============================================

SELECT
    auth.uid() as current_user_id,
    u.role,
    CASE
        WHEN u.role IN ('admin','super_admin','manager','accountant')
        THEN '✅ INSERT SHOULD WORK NOW'
        ELSE '❌ ROLE ISSUE - UPDATE ROLE'
    END as status
FROM public.users u
WHERE u.id = auth.uid();
