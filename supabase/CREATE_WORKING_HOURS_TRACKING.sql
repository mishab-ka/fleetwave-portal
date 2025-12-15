-- =====================================================
-- WORKING HOURS TRACKING SYSTEM
-- =====================================================
-- This system tracks daily, weekly, and monthly working hours
-- based on clock in/out times and active work seconds
-- (excluding background time when app is closed)
-- =====================================================

-- First, ensure hr_staff_attendance has active_work_seconds column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hr_staff_attendance' 
    AND column_name = 'active_work_seconds'
  ) THEN
    ALTER TABLE hr_staff_attendance 
    ADD COLUMN active_work_seconds INTEGER DEFAULT 0;
    
    COMMENT ON COLUMN hr_staff_attendance.active_work_seconds IS 
    'Total active work time in seconds (excludes background time)';
  END IF;
END $$;

-- Create or update hr_staff_daily_stats to include working hours
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hr_staff_daily_stats' 
    AND column_name = 'active_work_hours'
  ) THEN
    ALTER TABLE hr_staff_daily_stats 
    ADD COLUMN active_work_hours DECIMAL(10,2) DEFAULT 0;
    
    COMMENT ON COLUMN hr_staff_daily_stats.active_work_hours IS 
    'Total active working hours for the day (from active_work_seconds)';
  END IF;
END $$;

-- Function to calculate and update daily working hours
CREATE OR REPLACE FUNCTION calculate_daily_working_hours(
  p_staff_user_id UUID,
  p_date DATE
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total_active_seconds INTEGER := 0;
  v_active_hours DECIMAL(10,2) := 0;
BEGIN
  -- Sum all active_work_seconds from attendance records for this date
  SELECT COALESCE(SUM(active_work_seconds), 0)
  INTO v_total_active_seconds
  FROM hr_staff_attendance
  WHERE staff_user_id = p_staff_user_id
    AND DATE(clock_in_time) = p_date;
  
  -- Convert seconds to hours (rounded to 2 decimal places)
  v_active_hours := ROUND((v_total_active_seconds::DECIMAL / 3600.0)::NUMERIC, 2);
  
  -- Update daily stats with working hours
  UPDATE hr_staff_daily_stats
  SET active_work_hours = v_active_hours,
      updated_at = NOW()
  WHERE staff_user_id = p_staff_user_id
    AND date = p_date;
  
  -- If no daily stats record exists, create one
  IF NOT FOUND THEN
    INSERT INTO hr_staff_daily_stats (
      staff_user_id,
      date,
      active_work_hours,
      created_at,
      updated_at
    ) VALUES (
      p_staff_user_id,
      p_date,
      v_active_hours,
      NOW(),
      NOW()
    )
    ON CONFLICT (staff_user_id, date) 
    DO UPDATE SET 
      active_work_hours = v_active_hours,
      updated_at = NOW();
  END IF;
  
  RETURN v_active_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to get working hours for a date range
CREATE OR REPLACE FUNCTION get_working_hours_range(
  p_staff_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  date DATE,
  active_work_hours DECIMAL(10,2),
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  total_sessions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(a.clock_in_time) as date,
    COALESCE(ROUND((SUM(a.active_work_seconds)::DECIMAL / 3600.0)::NUMERIC, 2), 0) as active_work_hours,
    MIN(a.clock_in_time) as clock_in_time,
    MAX(a.clock_out_time) as clock_out_time,
    COUNT(DISTINCT a.id) as total_sessions
  FROM hr_staff_attendance a
  WHERE a.staff_user_id = p_staff_user_id
    AND DATE(a.clock_in_time) >= p_start_date
    AND DATE(a.clock_in_time) <= p_end_date
  GROUP BY DATE(a.clock_in_time)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get weekly working hours
CREATE OR REPLACE FUNCTION get_weekly_working_hours(
  p_staff_user_id UUID,
  p_week_start DATE
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total_hours DECIMAL(10,2) := 0;
  v_week_end DATE;
BEGIN
  v_week_end := p_week_start + INTERVAL '6 days';
  
  SELECT COALESCE(SUM(active_work_hours), 0)
  INTO v_total_hours
  FROM hr_staff_daily_stats
  WHERE staff_user_id = p_staff_user_id
    AND date >= p_week_start
    AND date <= v_week_end;
  
  RETURN COALESCE(v_total_hours, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly working hours
CREATE OR REPLACE FUNCTION get_monthly_working_hours(
  p_staff_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total_hours DECIMAL(10,2) := 0;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1));
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::DATE;
  
  SELECT COALESCE(SUM(active_work_hours), 0)
  INTO v_total_hours
  FROM hr_staff_daily_stats
  WHERE staff_user_id = p_staff_user_id
    AND date >= v_start_date
    AND date <= v_end_date;
  
  RETURN COALESCE(v_total_hours, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update daily working hours when attendance is updated
CREATE OR REPLACE FUNCTION update_daily_working_hours_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update working hours for the date of this attendance record
  PERFORM calculate_daily_working_hours(
    NEW.staff_user_id,
    DATE(NEW.clock_in_time)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_update_daily_working_hours ON hr_staff_attendance;

-- Create trigger
CREATE TRIGGER trg_update_daily_working_hours
AFTER INSERT OR UPDATE OF active_work_seconds, clock_out_time ON hr_staff_attendance
FOR EACH ROW
EXECUTE FUNCTION update_daily_working_hours_on_attendance();

-- Update aggregate_daily_stats to include working hours
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
  v_active_work_hours DECIMAL(10,2);
BEGIN
  -- Get call metrics (existing logic)
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

  -- Get attendance info with active work hours
  SELECT 
    MIN(clock_in_time),
    MAX(clock_out_time),
    COALESCE(SUM(total_work_duration_seconds) / 3600.0, 0),
    COALESCE(SUM(active_work_seconds) / 3600.0, 0)
  INTO 
    v_clock_in,
    v_clock_out,
    v_work_hours,
    v_active_work_hours
  FROM hr_staff_attendance
  WHERE staff_user_id = p_staff_user_id
    AND DATE(clock_in_time) = p_date;

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
    active_work_hours,
    updated_at
  ) VALUES (
    p_staff_user_id,
    p_date,
    v_total_calls,
    v_successful_calls,
    v_failed_calls,
    v_total_duration,
    v_avg_duration,
    v_total_calls,
    v_hot_leads,
    v_joined,
    v_callbacks,
    v_conversion_rate,
    COALESCE(v_status_breakdown, '{}'::jsonb),
    COALESCE(v_source_breakdown, '{}'::jsonb),
    v_clock_in,
    v_clock_out,
    v_work_hours,
    v_active_work_hours,
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
    leads_joined = EXCLUDED.joined,
    callbacks_scheduled = EXCLUDED.callbacks_scheduled,
    conversion_rate = EXCLUDED.conversion_rate,
    status_breakdown = EXCLUDED.status_breakdown,
    source_breakdown = EXCLUDED.source_breakdown,
    clock_in_time = EXCLUDED.clock_in_time,
    clock_out_time = EXCLUDED.clock_out_time,
    total_work_hours = EXCLUDED.total_work_hours,
    active_work_hours = EXCLUDED.active_work_hours,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_hr_attendance_active_work 
ON hr_staff_attendance(staff_user_id, DATE(clock_in_time), active_work_seconds);

-- Comments
COMMENT ON FUNCTION calculate_daily_working_hours IS 
'Calculates and updates daily active working hours from attendance records';

COMMENT ON FUNCTION get_working_hours_range IS 
'Returns working hours for a date range with session details';

COMMENT ON FUNCTION get_weekly_working_hours IS 
'Returns total working hours for a week';

COMMENT ON FUNCTION get_monthly_working_hours IS 
'Returns total working hours for a month';

