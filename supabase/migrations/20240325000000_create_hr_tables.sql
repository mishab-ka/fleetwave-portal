-- Create hiring_cycles table
CREATE TABLE hiring_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total_vacancies INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    ended_at TIMESTAMP WITH TIME ZONE,
    cycle_name TEXT NOT NULL DEFAULT 'Hiring Cycle',
    archived BOOLEAN DEFAULT false
);

-- Create applicants table
CREATE TABLE applicants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hiring_cycle_id UUID REFERENCES hiring_cycles(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    experience_years INTEGER NOT NULL,
    vehicle_type TEXT NOT NULL,
    additional_info TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    joining_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create unique constraint for one application per email per hiring cycle
CREATE UNIQUE INDEX unique_email_per_cycle ON applicants (email, hiring_cycle_id);

-- Create RLS policies
ALTER TABLE hiring_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- Policies for hiring_cycles
CREATE POLICY "Allow public read access to active hiring cycles"
ON hiring_cycles FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Allow authenticated users to manage hiring cycles"
ON hiring_cycles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for applicants
CREATE POLICY "Allow public to create applications"
ON applicants FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow applicants to view their own applications"
ON applicants FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated users to manage applications"
ON applicants FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to get current active hiring cycle
CREATE OR REPLACE FUNCTION get_active_hiring_cycle()
RETURNS UUID AS $$
DECLARE
    cycle_id UUID;
BEGIN
    SELECT id INTO cycle_id
    FROM hiring_cycles
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN cycle_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to archive hiring cycle
CREATE OR REPLACE FUNCTION archive_hiring_cycle(cycle_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE hiring_cycles
    SET is_active = false,
        ended_at = NOW(),
        archived = true
    WHERE id = cycle_id;
END;
$$ LANGUAGE plpgsql; 