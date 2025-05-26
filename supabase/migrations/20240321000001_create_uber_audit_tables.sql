-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS uber_weekly_audits CASCADE;
DROP TYPE IF EXISTS audit_status CASCADE;

-- Create enum for audit status
CREATE TYPE audit_status AS ENUM ('not_verified', 'pending', 'verified');

-- Create table for weekly Uber audits
CREATE TABLE uber_weekly_audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_end_date DATE NOT NULL,
    audit_status audit_status DEFAULT 'not_verified',
    description TEXT,
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(user_id, week_end_date)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_uber_weekly_audits_updated_at
    BEFORE UPDATE ON uber_weekly_audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE uber_weekly_audits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own audit records" ON uber_weekly_audits;
DROP POLICY IF EXISTS "Admins can view all audit records" ON uber_weekly_audits;
DROP POLICY IF EXISTS "Admins can insert audit records" ON uber_weekly_audits;
DROP POLICY IF EXISTS "Admins can update audit records" ON uber_weekly_audits;
DROP POLICY IF EXISTS "Admins can delete audit records" ON uber_weekly_audits;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
    ON uber_weekly_audits FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON uber_weekly_audits FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable update for authenticated users"
    ON uber_weekly_audits FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Enable delete for authenticated users"
    ON uber_weekly_audits FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    ); 