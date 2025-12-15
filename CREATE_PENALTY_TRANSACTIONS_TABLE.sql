-- Create driver_penalty_transactions table
CREATE TABLE IF NOT EXISTS public.driver_penalty_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('penalty', 'penalty_paid', 'bonus')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_user_id ON public.driver_penalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_type ON public.driver_penalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_driver_penalty_transactions_created_at ON public.driver_penalty_transactions(created_at);

-- Enable Row Level Security
ALTER TABLE public.driver_penalty_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_driver_penalty_transactions_updated_at 
    BEFORE UPDATE ON public.driver_penalty_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();