-- ============================================
-- COMPREHENSIVE RLS POLICY FIX
-- Enable Transaction and Report Access for Manager/Accountant/Admin
-- ============================================
-- This script ensures:
-- - INSERT: Admin, Manager, Accountant can add transactions and reports
-- - DELETE: Only Admin can delete transactions and reports
-- - UPDATE: Admin, Manager, Accountant can update transactions and reports
-- - SELECT: Users can see their own data, staff can see all
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on all tables
-- ============================================

ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_audits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop all existing policies to avoid conflicts
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
    
    -- Drop policies for fleet_reports
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'fleet_reports'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.fleet_reports', pol.policyname);
    END LOOP;
    
    -- Drop policies for vehicle_audits
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'vehicle_audits'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicle_audits', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 3: DRIVER PENALTY TRANSACTIONS POLICIES
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
-- STEP 4: DRIVER BALANCE TRANSACTIONS POLICIES
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
-- STEP 5: FLEET REPORTS POLICIES
-- ============================================

-- INSERT: Allow Admin, Manager, Accountant to INSERT
CREATE POLICY "allow_insert_fleet_reports"
ON public.fleet_reports
FOR INSERT
TO authenticated
WITH CHECK (
    -- Drivers can insert their own reports
    auth.uid() = user_id
    OR
    -- Staff can insert reports for any driver
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- SELECT: Users can see their own, Staff can see all
CREATE POLICY "allow_select_fleet_reports"
ON public.fleet_reports
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
CREATE POLICY "allow_update_fleet_reports"
ON public.fleet_reports
FOR UPDATE
TO authenticated
USING (
    -- Drivers can update their own reports
    auth.uid() = user_id
    OR
    -- Staff can update any report
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
)
WITH CHECK (
    -- Drivers can update their own reports
    auth.uid() = user_id
    OR
    -- Staff can update any report
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- DELETE: Only Admin can DELETE
CREATE POLICY "allow_delete_fleet_reports"
ON public.fleet_reports
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
-- STEP 6: VEHICLE AUDITS POLICIES
-- ============================================

-- INSERT: Allow Admin, Manager, Accountant to INSERT
CREATE POLICY "allow_insert_vehicle_audits"
ON public.vehicle_audits
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

-- SELECT: Staff can see all audits
CREATE POLICY "allow_select_vehicle_audits"
ON public.vehicle_audits
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- UPDATE: Allow Admin, Manager, Accountant to UPDATE
CREATE POLICY "allow_update_vehicle_audits"
ON public.vehicle_audits
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
CREATE POLICY "allow_delete_vehicle_audits"
ON public.vehicle_audits
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
-- STEP 7: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_user_id 
ON public.driver_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_type 
ON public.driver_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_balance_transactions_created_at 
ON public.driver_balance_transactions(created_at);

-- ============================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================

-- Verify policies were created
SELECT 
    'Policies Created' as info,
    tablename,
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename IN (
    'driver_penalty_transactions', 
    'driver_balance_transactions',
    'fleet_reports',
    'vehicle_audits'
)
AND schemaname = 'public'
ORDER BY tablename, cmd;

-- Check current user's role and permissions
SELECT
    auth.uid() as current_user_id,
    u.role,
    u.email,
    CASE
        WHEN u.role IN ('admin', 'super_admin', 'manager', 'accountant')
        THEN '✅ Can INSERT transactions and reports'
        ELSE '❌ Cannot INSERT - Role issue'
    END as insert_permission,
    CASE
        WHEN u.role IN ('admin', 'super_admin')
        THEN '✅ Can DELETE transactions and reports'
        ELSE '❌ Cannot DELETE - Admin only'
    END as delete_permission
FROM public.users u
WHERE u.id = auth.uid();

-- Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(cmd, ', ' ORDER BY cmd) as operations
FROM pg_policies 
WHERE tablename IN (
    'driver_penalty_transactions', 
    'driver_balance_transactions',
    'fleet_reports',
    'vehicle_audits'
)
AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

