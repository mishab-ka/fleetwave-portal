-- Create HR Staff Daily Stats Table for Performance History
-- This table stores daily aggregated metrics for each HR staff member

CREATE TABLE IF NOT EXISTS hr_staff_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Call metrics
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  total_call_duration INTEGER DEFAULT 0, -- in seconds
  avg_call_duration DECIMAL(10,2) DEFAULT 0,
  
  -- Lead metrics
  leads_contacted INTEGER DEFAULT 0,
  hot_leads_generated INTEGER DEFAULT 0,
  leads_joined INTEGER DEFAULT 0,
  callbacks_scheduled INTEGER DEFAULT 0,
  
  -- Performance metrics
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Status breakdown (JSON)
  status_breakdown JSONB DEFAULT '{}',
  source_breakdown JSONB DEFAULT '{}',
  
  -- Attendance
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  total_work_hours DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(staff_user_id, date)
);

-- Create indexes for faster queries
CREATE INDEX idx_hr_staff_daily_stats_staff_date 
ON hr_staff_daily_stats(staff_user_id, date DESC);

CREATE INDEX idx_hr_staff_daily_stats_date 
ON hr_staff_daily_stats(date DESC);

CREATE INDEX idx_hr_staff_daily_stats_staff 
ON hr_staff_daily_stats(staff_user_id);

-- Enable RLS
ALTER TABLE hr_staff_daily_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Daily stats viewable by authenticated users" ON hr_staff_daily_stats;
DROP POLICY IF EXISTS "Daily stats editable by staff" ON hr_staff_daily_stats;

-- Create policies
CREATE POLICY "Daily stats viewable by authenticated users" ON hr_staff_daily_stats 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Daily stats editable by staff" ON hr_staff_daily_stats 
FOR ALL USING (
    staff_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'hr_manager'))
);

-- Add comments
COMMENT ON TABLE hr_staff_daily_stats IS 'Daily aggregated performance metrics for HR staff';
COMMENT ON COLUMN hr_staff_daily_stats.total_calls IS 'Total number of calls made on this date';
COMMENT ON COLUMN hr_staff_daily_stats.successful_calls IS 'Number of calls that resulted in joined, hot_lead, or callback';
COMMENT ON COLUMN hr_staff_daily_stats.conversion_rate IS 'Percentage of successful calls out of total calls';
COMMENT ON COLUMN hr_staff_daily_stats.status_breakdown IS 'JSON object with count of each status';
COMMENT ON COLUMN hr_staff_daily_stats.source_breakdown IS 'JSON object with count of each source';

-- Function to aggregate daily stats
CREATE OR REPLACE FUNCTION aggregate_daily_stats(
  p_staff_user_id UUID,
  p_date DATE
) RETURNS void AS $$
DECLARE
  v_total_calls INTEGER;
  v_successful_calls INTEGER;
  v_failed_calls INTEGER;
  v_total_duration INTEGER;
  v_avg_duration DECIMAL(10,2);
  v_hot_leads INTEGER;
  v_joined INTEGER;
  v_callbacks INTEGER;
  v_conversion_rate DECIMAL(5,2);
  v_status_breakdown JSONB;
  v_source_breakdown JSONB;
  v_clock_in TIMESTAMP WITH TIME ZONE;
  v_clock_out TIMESTAMP WITH TIME ZONE;
  v_work_hours DECIMAL(10,2);
BEGIN
  -- Get call metrics
  SELECT 
    COUNT(*),
    SUM(CASE WHEN status IN ('joined', 'hot_lead', 'callback') THEN 1 ELSE 0 END),
    SUM(CASE WHEN status IN ('not_interested', 'call_not_picked', 'wrong_number') THEN 1 ELSE 0 END),
    COALESCE(SUM(call_duration), 0),
    COALESCE(AVG(call_duration), 0),
    SUM(CASE WHEN status = 'hot_lead' THEN 1 ELSE 0 END),
    SUM(CASE WHEN status = 'joined' THEN 1 ELSE 0 END),
    SUM(CASE WHEN status = 'callback' THEN 1 ELSE 0 END)
  INTO 
    v_total_calls,
    v_successful_calls,
    v_failed_calls,
    v_total_duration,
    v_avg_duration,
    v_hot_leads,
    v_joined,
    v_callbacks
  FROM hr_call_tracking
  WHERE staff_user_id = p_staff_user_id
    AND called_date = p_date;

  -- Calculate conversion rate
  IF v_total_calls > 0 THEN
    v_conversion_rate := (v_successful_calls::DECIMAL / v_total_calls::DECIMAL) * 100;
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- Get status breakdown
  SELECT jsonb_object_agg(status, count)
  INTO v_status_breakdown
  FROM (
    SELECT status, COUNT(*) as count
    FROM hr_call_tracking
    WHERE staff_user_id = p_staff_user_id
      AND called_date = p_date
    GROUP BY status
  ) status_counts;

  -- Get source breakdown
  SELECT jsonb_object_agg(source, count)
  INTO v_source_breakdown
  FROM (
    SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
    FROM hr_call_tracking
    WHERE staff_user_id = p_staff_user_id
      AND called_date = p_date
    GROUP BY source
  ) source_counts;

  -- Get attendance info
  SELECT 
    clock_in_time,
    clock_out_time,
    COALESCE(total_work_duration_seconds / 3600.0, 0)
  INTO 
    v_clock_in,
    v_clock_out,
    v_work_hours
  FROM hr_staff_attendance
  WHERE staff_user_id = p_staff_user_id
    AND DATE(clock_in_time) = p_date
  ORDER BY clock_in_time DESC
  LIMIT 1;

  -- Insert or update daily stats
  INSERT INTO hr_staff_daily_stats (
    staff_user_id,
    date,
    total_calls,
    successful_calls,
    failed_calls,
    total_call_duration,
    avg_call_duration,
    leads_contacted,
    hot_leads_generated,
    leads_joined,
    callbacks_scheduled,
    conversion_rate,
    status_breakdown,
    source_breakdown,
    clock_in_time,
    clock_out_time,
    total_work_hours,
    updated_at
  ) VALUES (
    p_staff_user_id,
    p_date,
    COALESCE(v_total_calls, 0),
    COALESCE(v_successful_calls, 0),
    COALESCE(v_failed_calls, 0),
    COALESCE(v_total_duration, 0),
    COALESCE(v_avg_duration, 0),
    COALESCE(v_total_calls, 0),
    COALESCE(v_hot_leads, 0),
    COALESCE(v_joined, 0),
    COALESCE(v_callbacks, 0),
    COALESCE(v_conversion_rate, 0),
    COALESCE(v_status_breakdown, '{}'::jsonb),
    COALESCE(v_source_breakdown, '{}'::jsonb),
    v_clock_in,
    v_clock_out,
    COALESCE(v_work_hours, 0),
    NOW()
  )
  ON CONFLICT (staff_user_id, date)
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    successful_calls = EXCLUDED.successful_calls,
    failed_calls = EXCLUDED.failed_calls,
    total_call_duration = EXCLUDED.total_call_duration,
    avg_call_duration = EXCLUDED.avg_call_duration,
    leads_contacted = EXCLUDED.leads_contacted,
    hot_leads_generated = EXCLUDED.hot_leads_generated,
    leads_joined = EXCLUDED.leads_joined,
    callbacks_scheduled = EXCLUDED.callbacks_scheduled,
    conversion_rate = EXCLUDED.conversion_rate,
    status_breakdown = EXCLUDED.status_breakdown,
    source_breakdown = EXCLUDED.source_breakdown,
    clock_in_time = EXCLUDED.clock_in_time,
    clock_out_time = EXCLUDED.clock_out_time,
    total_work_hours = EXCLUDED.total_work_hours,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update daily stats when a call is tracked
CREATE OR REPLACE FUNCTION trigger_update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM aggregate_daily_stats(NEW.staff_user_id, NEW.called_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_stats_on_call ON hr_call_tracking;

CREATE TRIGGER update_daily_stats_on_call
AFTER INSERT OR UPDATE ON hr_call_tracking
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_stats();

-- Trigger to update daily stats when attendance is recorded
CREATE OR REPLACE FUNCTION trigger_update_daily_stats_attendance()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM aggregate_daily_stats(NEW.staff_user_id, DATE(NEW.clock_in_time));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_stats_on_attendance ON hr_staff_attendance;

CREATE TRIGGER update_daily_stats_on_attendance
AFTER INSERT OR UPDATE ON hr_staff_attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_stats_attendance();

