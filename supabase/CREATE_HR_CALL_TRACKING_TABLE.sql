-- Create HR Call Tracking Table
-- This table stores call tracking data for performance analytics

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_staff_user ON hr_call_tracking(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_lead ON hr_call_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_called_date ON hr_call_tracking(called_date);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_status ON hr_call_tracking(status);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_source ON hr_call_tracking(source);

-- Enable RLS
ALTER TABLE hr_call_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Call tracking is viewable by authenticated users" ON hr_call_tracking 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Call tracking is editable by staff" ON hr_call_tracking 
FOR ALL USING (
    staff_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'hr_manager'))
);

-- Add comments
COMMENT ON TABLE hr_call_tracking IS 'HR call tracking data for performance analytics';
COMMENT ON COLUMN hr_call_tracking.call_duration IS 'Call duration in seconds';
COMMENT ON COLUMN hr_call_tracking.source IS 'Lead source: whatsapp, facebook, instagram, etc.';
