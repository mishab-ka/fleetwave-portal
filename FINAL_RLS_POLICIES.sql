-- ============================================
-- FINAL RLS POLICIES - Manager/Accountant can INSERT, Only Admin can DELETE
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

-- ============================================
-- driver_penalty_transactions Policies
-- ============================================

-- INSERT: Admin, Manager, Accountant can INSERT
CREATE POLICY "penalty_insert_staff"
ON public.driver_penalty_transactions FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- SELECT: Users see own, Staff see all
CREATE POLICY "penalty_select"
ON public.driver_penalty_transactions FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- UPDATE: Admin, Manager, Accountant can UPDATE
CREATE POLICY "penalty_update_staff"
ON public.driver_penalty_transactions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')));

-- DELETE: ONLY Admin can DELETE
CREATE POLICY "penalty_delete_admin_only"
ON public.driver_penalty_transactions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

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

-- INSERT: Admin, Manager, Accountant can INSERT
CREATE POLICY "balance_insert_staff"
ON public.driver_balance_transactions FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- SELECT: Users see own, Staff see all
CREATE POLICY "balance_select"
ON public.driver_balance_transactions FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant'))
);

-- UPDATE: Admin, Manager, Accountant can UPDATE
CREATE POLICY "balance_update_staff"
ON public.driver_balance_transactions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'accountant')));

-- DELETE: ONLY Admin can DELETE
CREATE POLICY "balance_delete_admin_only"
ON public.driver_balance_transactions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_user_id ON public.driver_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_type ON public.driver_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_created_at ON public.driver_balance_transactions(created_at);

-- Verify policies
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('driver_penalty_transactions', 'driver_balance_transactions') 
AND schemaname = 'public'
ORDER BY tablename, cmd;

