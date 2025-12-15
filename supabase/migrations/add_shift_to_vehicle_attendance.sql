-- Add shift support to vehicle_attendance table
ALTER TABLE public.vehicle_attendance 
ADD COLUMN IF NOT EXISTS shift TEXT CHECK (shift IN ('morning', 'night')) DEFAULT 'morning';

-- Update the unique constraint to include shift
DROP CONSTRAINT IF EXISTS vehicle_attendance_vehicle_number_date_key;
ALTER TABLE public.vehicle_attendance 
ADD CONSTRAINT vehicle_attendance_vehicle_number_date_shift_key 
UNIQUE (vehicle_number, date, shift);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_shift_lookup 
ON public.vehicle_attendance(vehicle_number, date, shift); 