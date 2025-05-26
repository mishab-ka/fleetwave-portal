-- Create enum type for vehicle status
CREATE TYPE vehicle_status AS ENUM ('running', 'stopped', 'breakdown', 'leave');

-- Create vehicle_attendance table
CREATE TABLE IF NOT EXISTS vehicle_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_number TEXT NOT NULL REFERENCES vehicles(vehicle_number),
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'breakdown', 'leave')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(vehicle_number, date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_vehicle_number ON vehicle_attendance(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_date ON vehicle_attendance(date);
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_status ON vehicle_attendance(status);

-- Add RLS policies
ALTER TABLE vehicle_attendance ENABLE ROW LEVEL SECURITY;

-- Policy for viewing vehicle attendance (all authenticated users can view)
CREATE POLICY "Authenticated users can view vehicle attendance"
    ON vehicle_attendance FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy for inserting/updating vehicle attendance (admins only)
CREATE POLICY "Only admins can modify vehicle attendance"
    ON vehicle_attendance FOR ALL
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_vehicle_attendance_updated_at
    BEFORE UPDATE ON vehicle_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 