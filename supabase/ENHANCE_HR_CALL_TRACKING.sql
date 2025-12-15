-- Enhance HR Call Tracking Table
-- Add quality and response time metrics

-- Add new columns to hr_call_tracking
ALTER TABLE hr_call_tracking 
ADD COLUMN IF NOT EXISTS response_time_hours DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS call_quality_score INTEGER CHECK (call_quality_score BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_response_time ON hr_call_tracking(response_time_hours);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_quality ON hr_call_tracking(call_quality_score);
CREATE INDEX IF NOT EXISTS idx_hr_call_tracking_follow_up ON hr_call_tracking(follow_up_required);

-- Add comments
COMMENT ON COLUMN hr_call_tracking.response_time_hours IS 'Time in hours from lead assignment to first call';
COMMENT ON COLUMN hr_call_tracking.call_quality_score IS 'Quality rating of the call (1-5 scale)';
COMMENT ON COLUMN hr_call_tracking.follow_up_required IS 'Whether this call requires follow-up action';

