-- Change worked_days, working_days_multiplier and exact_working_days from INTEGER to DECIMAL
-- This allows storing decimal values like 0.5, 1.5, etc.

-- Change worked_days to DECIMAL (calculated as reportCount / 2, can be 0.5, 1.5, etc.)
ALTER TABLE public.vehicle_performance 
ALTER COLUMN worked_days TYPE DECIMAL(10,2) USING worked_days::DECIMAL(10,2);

-- Change working_days_multiplier to DECIMAL
ALTER TABLE public.vehicle_performance 
ALTER COLUMN working_days_multiplier TYPE DECIMAL(10,2) USING working_days_multiplier::DECIMAL(10,2);

-- Add exact_working_days column if it doesn't exist, or alter it if it does
DO $$
BEGIN
    -- Check if exact_working_days column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_performance' 
        AND column_name = 'exact_working_days'
    ) THEN
        -- Column exists, alter it to DECIMAL
        ALTER TABLE public.vehicle_performance 
        ALTER COLUMN exact_working_days TYPE DECIMAL(10,2) USING exact_working_days::DECIMAL(10,2);
    ELSE
        -- Column doesn't exist, add it as DECIMAL
        ALTER TABLE public.vehicle_performance 
        ADD COLUMN exact_working_days DECIMAL(10,2) DEFAULT 7.00;
    END IF;
END $$;

-- Update comments
COMMENT ON COLUMN public.vehicle_performance.worked_days IS 'Worked days calculated from reports (can be decimal, e.g., 0.5 for half day, calculated as reportCount / 2)';
COMMENT ON COLUMN public.vehicle_performance.working_days_multiplier IS 'Working days multiplier (can be decimal, e.g., 0.5 for half day)';
COMMENT ON COLUMN public.vehicle_performance.exact_working_days IS 'Exact working days for rent calculation (can be decimal, e.g., 0.5 for half day)';

