-- ============================================
-- Fix RLS Policies for Transaction Tables
-- Allows Admin, Manager, and Accountant to INSERT transactions
-- Only Admin can DELETE
-- ============================================

-- Step 1: Enable RLS on both tables
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to avoid conflicts
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
-- driver_penalty_transactions Policies
-- ============================================

-- INSERT: Allow Admin, Manager, Accountant to INSERT
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

-- SELECT: Users can see their own, Staff can see all
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

-- UPDATE: Allow Admin, Manager, Accountant to UPDATE
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

-- DELETE: Only Admin can DELETE
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

-- ============================================
-- driver_balance_transactions Policies
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

-- INSERT: Allow Admin, Manager, Accountant to INSERT
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

-- SELECT: Users can see their own, Staff can see ALL transactions
-- This policy allows staff to view any driver's transactions
CREATE POLICY "allow_select_balance"
ON public.driver_balance_transactions
FOR SELECT
TO authenticated
USING (
    -- Users can see their own transactions
    auth.uid() = user_id
    OR
    -- Staff (admin, manager, accountant) can see ALL transactions for any driver
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- UPDATE: Allow Admin, Manager, Accountant to UPDATE
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

-- DELETE: Only Admin can DELETE
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

-- ============================================
-- Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_user_id 
ON public.driver_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_type 
ON public.driver_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_created_at 
ON public.driver_balance_transactions(created_at);

-- ============================================
-- Verification Queries
-- ============================================

-- Verify policies were created
SELECT 
    'Policies Created' as info,
    tablename,
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename IN ('driver_penalty_transactions', 'driver_balance_transactions')
AND schemaname = 'public'
ORDER BY tablename, cmd;

