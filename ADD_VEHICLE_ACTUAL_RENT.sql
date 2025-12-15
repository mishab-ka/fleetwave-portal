-- Add actual_rent column to vehicles table
-- This will store the weekly fixed rent amount per vehicle

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS actual_rent DECIMAL(10, 2) DEFAULT 0;

-- Add comment to describe the column
COMMENT ON COLUMN vehicles.actual_rent IS 'Weekly fixed rent amount for this vehicle (₹)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_actual_rent ON vehicles(actual_rent);

-- Optional: Set default rent for existing vehicles (you can adjust this value)
-- UPDATE vehicles SET actual_rent = 4200 WHERE actual_rent = 0 AND online = true;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'vehicles' AND column_name = 'actual_rent';




