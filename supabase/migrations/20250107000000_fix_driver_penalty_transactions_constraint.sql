-- Fix driver_penalty_transactions table constraint
-- This migration ensures the table exists with the correct constraint

-- Create the table if it doesn't exist
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

-- Drop the existing constraint if it exists (in case it's outdated)
ALTER TABLE public.driver_penalty_transactions 
DROP CONSTRAINT IF EXISTS driver_penalty_transactions_type_check;

-- Add the correct constraint with all valid types
ALTER TABLE public.driver_penalty_transactions 
ADD CONSTRAINT driver_penalty_transactions_type_check 
CHECK (type IN ('penalty', 'penalty_paid', 'bonus', 'refund'));

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_user_id ON public.driver_penalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_type ON public.driver_penalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_created_at ON public.driver_penalty_transactions(created_at);

-- Enable Row Level Security if not already enabled
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own penalty transactions" ON public.driver_penalty_transactions;
    DROP POLICY IF EXISTS "Admins can manage all penalty transactions" ON public.driver_penalty_transactions;
    
    -- Create the policies
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
END $$;

-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_driver_penalty_transactions_updated_at ON public.driver_penalty_transactions;
CREATE TRIGGER update_driver_penalty_transactions_updated_at 
    BEFORE UPDATE ON public.driver_penalty_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.driver_penalty_transactions IS 'Stores penalty transactions for drivers including penalties, payments, bonuses, and refunds';
COMMENT ON COLUMN public.driver_penalty_transactions.type IS 'Transaction type: penalty, penalty_paid, bonus, or refund';
COMMENT ON COLUMN public.driver_penalty_transactions.amount IS 'Transaction amount in INR';
COMMENT ON COLUMN public.driver_penalty_transactions.description IS 'Optional description for the transaction';

