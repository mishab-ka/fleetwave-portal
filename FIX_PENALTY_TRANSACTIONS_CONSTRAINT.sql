-- Quick fix for driver_penalty_transactions constraint error
-- Run this SQL directly in your Supabase SQL editor or psql

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.driver_penalty_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Drop old constraint and add correct one
ALTER TABLE public.driver_penalty_transactions 
DROP CONSTRAINT IF EXISTS driver_penalty_transactions_type_check;

ALTER TABLE public.driver_penalty_transactions 
ADD CONSTRAINT driver_penalty_transactions_type_check 
CHECK (type IN ('penalty', 'penalty_paid', 'bonus', 'refund'));

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_user_id ON public.driver_penalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_type ON public.driver_penalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_created_at ON public.driver_penalty_transactions(created_at);

-- Step 4: Enable RLS and create policies
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own penalty transactions" ON public.driver_penalty_transactions;
DROP POLICY IF EXISTS "Admins can manage all penalty transactions" ON public.driver_penalty_transactions;

-- Create policies
CREATE POLICY "Users can view their own penalty transactions" ON public.driver_penalty_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all penalty transactions" ON public.driver_penalty_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Verify the constraint is working
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'driver_penalty_transactions_type_check';

