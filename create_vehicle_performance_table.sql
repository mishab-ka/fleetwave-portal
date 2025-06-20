-- Create vehicle_performance table
CREATE TABLE IF NOT EXISTS public.vehicle_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_number TEXT NOT NULL,
    date DATE NOT NULL,
    total_trips INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    total_rent DECIMAL(10,2) DEFAULT 0,
    additional_income DECIMAL(10,2) DEFAULT 0,
    expenses DECIMAL(10,2) DEFAULT 0,
    profit_loss DECIMAL(10,2) DEFAULT 0,
    worked_days INTEGER DEFAULT 0,
    working_days_multiplier INTEGER DEFAULT 7,
    avg_trips_per_day DECIMAL(8,2) DEFAULT 0,
    avg_earnings_per_day DECIMAL(8,2) DEFAULT 0,
    rent_slab TEXT,
    performance_status TEXT CHECK (performance_status IN ('profit', 'loss', 'break_even')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Unique constraint to prevent duplicate entries for same vehicle on same date
    UNIQUE(vehicle_number, date)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.vehicle_performance ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all records
CREATE POLICY "Users can view vehicle performance" ON public.vehicle_performance
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to insert records
CREATE POLICY "Users can insert vehicle performance" ON public.vehicle_performance
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update records
CREATE POLICY "Users can update vehicle performance" ON public.vehicle_performance
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete records
CREATE POLICY "Users can delete vehicle performance" ON public.vehicle_performance
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_performance_vehicle_number ON public.vehicle_performance(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_performance_date ON public.vehicle_performance(date);
CREATE INDEX IF NOT EXISTS idx_vehicle_performance_vehicle_date ON public.vehicle_performance(vehicle_number, date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_vehicle_performance_updated_at
    BEFORE UPDATE ON public.vehicle_performance
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 