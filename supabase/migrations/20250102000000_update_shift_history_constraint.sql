-- Update shift_history table to allow "none" as a valid shift value
-- First, drop the existing check constraint
ALTER TABLE shift_history DROP CONSTRAINT IF EXISTS shift_history_shift_check;

-- Add the new check constraint that includes "none"
ALTER TABLE shift_history ADD CONSTRAINT shift_history_shift_check 
CHECK (shift IN ('morning', 'night', '24hr', 'none'));

-- Also update the users table shift column if it has a similar constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_shift_check;

-- Add check constraint to users table shift column
ALTER TABLE users ADD CONSTRAINT users_shift_check 
CHECK (shift IN ('morning', 'night', '24hr', 'none') OR shift IS NULL);

-- Make vehicle_number nullable in fleet_reports table if it's not already
ALTER TABLE fleet_reports ALTER COLUMN vehicle_number DROP NOT NULL;

-- Update foreign key constraint to allow null values for vehicle_number
ALTER TABLE fleet_reports DROP CONSTRAINT IF EXISTS fleet_reports_vehicle_number_fkey;
ALTER TABLE fleet_reports ADD CONSTRAINT fleet_reports_vehicle_number_fkey 
FOREIGN KEY (vehicle_number) REFERENCES vehicles(vehicle_number) ON DELETE SET NULL;
