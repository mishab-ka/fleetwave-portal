-- Create vehicles table with primary key
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_number TEXT NOT NULL UNIQUE,
    make TEXT,
    model TEXT,
    year INTEGER,
    vin TEXT UNIQUE,
    license_plate TEXT UNIQUE,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX vehicles_vehicle_number_idx ON vehicles(vehicle_number);
CREATE INDEX vehicles_status_idx ON vehicles(status);

-- Add RLS policies
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Policy for viewing vehicles (all authenticated users can view)
CREATE POLICY "Authenticated users can view vehicles"
    ON vehicles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy for inserting/updating/deleting vehicles (admins only)
CREATE POLICY "Only admins can modify vehicles"
    ON vehicles FOR ALL
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));