-- Complete HR Call Tracking Setup
-- This script creates the table, fixes foreign keys, and adds sample data

-- 1. Create the hr_call_tracking table
CREATE TABLE IF NOT EXISTS hr_call_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES hr_leads(id) ON DELETE CASCADE,
    staff_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    called_date DATE NOT NULL,
    callback_date DATE,
    joining_date DATE,
    notes TEXT,
    source VARCHAR(50),
    call_duration INTEGER DEFAULT 0, -- Duration in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_staff_user ON hr_call_tracking(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_lead ON hr_call_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_called_date ON hr_call_tracking(called_date);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_status ON hr_call_tracking(status);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_source ON hr_call_tracking(source);

-- 3. Enable RLS
ALTER TABLE hr_call_tracking ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Call tracking is viewable by authenticated users" ON hr_call_tracking;
DROP POLICY IF EXISTS "Call tracking is editable by staff" ON hr_call_tracking;

-- 5. Create policies
CREATE POLICY "Call tracking is viewable by authenticated users" ON hr_call_tracking 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Call tracking is editable by staff" ON hr_call_tracking 
FOR ALL USING (
    staff_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'hr_manager'))
);

-- 6. Add comments
COMMENT ON TABLE hr_call_tracking IS 'HR call tracking data for performance analytics';
COMMENT ON COLUMN hr_call_tracking.call_duration IS 'Call duration in seconds';
COMMENT ON COLUMN hr_call_tracking.source IS 'Lead source: whatsapp, facebook, instagram, etc.';

-- 7. Insert sample data for testing
-- First, let's check if we have any existing leads and users
DO $$
DECLARE
    sample_lead_id UUID;
    sample_staff_id UUID;
BEGIN
    -- Get a sample lead ID
    SELECT id INTO sample_lead_id FROM hr_leads LIMIT 1;
    
    -- Get a sample staff user ID
    SELECT id INTO sample_staff_id FROM auth.users WHERE role = 'hr_staff' LIMIT 1;
    
    -- If we have both, insert sample data
    IF sample_lead_id IS NOT NULL AND sample_staff_id IS NOT NULL THEN
        INSERT INTO hr_call_tracking (
            lead_id, 
            staff_user_id, 
            name, 
            phone, 
            status, 
            called_date, 
            call_duration, 
            source,
            notes
        ) VALUES 
        (
            sample_lead_id,
            sample_staff_id,
            'John Doe',
            '+1234567890',
            'contacted',
            CURRENT_DATE - INTERVAL '1 day',
            300,
            'whatsapp',
            'Initial contact made'
        ),
        (
            sample_lead_id,
            sample_staff_id,
            'Jane Smith',
            '+1234567891',
            'hot_lead',
            CURRENT_DATE,
            450,
            'facebook',
            'Very interested in the position'
        ),
        (
            sample_lead_id,
            sample_staff_id,
            'Mike Johnson',
            '+1234567892',
            'callback',
            CURRENT_DATE - INTERVAL '2 days',
            200,
            'instagram',
            'Will call back tomorrow'
        ),
        (
            sample_lead_id,
            sample_staff_id,
            'Sarah Wilson',
            '+1234567893',
            'joined',
            CURRENT_DATE - INTERVAL '3 days',
            600,
            'referral',
            'Successfully joined the team'
        ),
        (
            sample_lead_id,
            sample_staff_id,
            'David Brown',
            '+1234567894',
            'not_interested',
            CURRENT_DATE - INTERVAL '4 days',
            150,
            'website',
            'Not interested in the role'
        );
        
        RAISE NOTICE 'Sample data inserted successfully';
    ELSE
        RAISE NOTICE 'No existing leads or staff users found. Please create some first.';
    END IF;
END $$;

-- 8. Verify the setup
SELECT 
    'hr_call_tracking table created' as status,
    COUNT(*) as record_count
FROM hr_call_tracking;

