-- Add detailed adjustment fields to vehicle_performance table
ALTER TABLE public.vehicle_performance
ADD COLUMN IF NOT EXISTS other_income DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_income DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fuel_expense DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_expense DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS room_rent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS global_adjustments TEXT;

-- Create index on vehicle_number for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_performance_vehicle_lookup 
ON public.vehicle_performance(vehicle_number, date DESC); 