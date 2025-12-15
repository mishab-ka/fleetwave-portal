-- =====================================================
-- AUTOMATED JOBS FOR HR PERFORMANCE MONITORING
-- =====================================================
-- This file contains SQL functions and triggers for:
-- 1. Automated alert generation (runs hourly)
-- 2. Daily metrics calculation (runs at end of day)
-- 3. Auto clock-out for inactive staff
-- =====================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- FUNCTION: Check Targets and Generate Alerts
-- =====================================================
CREATE OR REPLACE FUNCTION check_targets_and_generate_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_record RECORD;
  current_value INTEGER;
  alert_message TEXT;
  alert_severity TEXT;
BEGIN
  -- Loop through all active targets
  FOR target_record IN 
    SELECT 
      t.*,
      u.name as staff_name
    FROM hr_staff_targets t
    JOIN users u ON t.staff_user_id = u.id
    WHERE t.is_active = TRUE
  LOOP
    current_value := 0;
    
    -- Calculate current value based on target type and period
    IF target_record.target_type = 'daily_calls' AND target_record.period = 'daily' THEN
      -- Count calls today
      SELECT COUNT(*)
      INTO current_value
      FROM hr_call_tracking
      WHERE staff_user_id = target_record.staff_user_id
        AND DATE(called_date) = CURRENT_DATE;
        
    ELSIF target_record.target_type = 'weekly_calls' AND target_record.period = 'weekly' THEN
      -- Count calls this week
      SELECT COUNT(*)
      INTO current_value
      FROM hr_call_tracking
      WHERE staff_user_id = target_record.staff_user_id
        AND called_date >= DATE_TRUNC('week', CURRENT_DATE);
        
    ELSIF target_record.target_type = 'monthly_calls' AND target_record.period = 'monthly' THEN
      -- Count calls this month
      SELECT COUNT(*)
      INTO current_value
      FROM hr_call_tracking
      WHERE staff_user_id = target_record.staff_user_id
        AND called_date >= DATE_TRUNC('month', CURRENT_DATE);
        
    ELSIF target_record.target_type = 'conversion_rate' THEN
      -- Calculate conversion rate
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN
            (COUNT(*) FILTER (WHERE status IN ('joined', 'hot_lead', 'callback'))::FLOAT / COUNT(*) * 100)::INTEGER
          ELSE 0
        END
      INTO current_value
      FROM hr_call_tracking
      WHERE staff_user_id = target_record.staff_user_id
        AND (
          (target_record.period = 'daily' AND DATE(called_date) = CURRENT_DATE) OR
          (target_record.period = 'weekly' AND called_date >= DATE_TRUNC('week', CURRENT_DATE)) OR
          (target_record.period = 'monthly' AND called_date >= DATE_TRUNC('month', CURRENT_DATE))
        );
    END IF;
    
    -- Check if target is not being met
    IF current_value < target_record.target_value THEN
      -- Determine severity based on how far behind
      IF current_value < (target_record.target_value * 0.5) THEN
        alert_severity := 'high';
      ELSIF current_value < (target_record.target_value * 0.75) THEN
        alert_severity := 'medium';
      ELSE
        alert_severity := 'low';
      END IF;
      
      alert_message := format(
        '%s is at %s/%s for %s (%s target)',
        target_record.staff_name,
        current_value,
        target_record.target_value,
        target_record.target_type,
        target_record.period
      );
      
      -- Insert alert (only if one doesn't exist for today)
      INSERT INTO hr_performance_alerts (
        staff_user_id,
        alert_type,
        message,
        severity,
        related_target_id
      )
      SELECT 
        target_record.staff_user_id,
        'target_not_met',
        alert_message,
        alert_severity,
        target_record.id
      WHERE NOT EXISTS (
        SELECT 1 
        FROM hr_performance_alerts
        WHERE staff_user_id = target_record.staff_user_id
          AND alert_type = 'target_not_met'
          AND related_target_id = target_record.id
          AND DATE(created_at) = CURRENT_DATE
          AND is_resolved = FALSE
      );
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- FUNCTION: Check for Idle Staff and Generate Alerts
-- =====================================================
CREATE OR REPLACE FUNCTION check_idle_staff_and_generate_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_record RECORD;
  idle_minutes INTEGER;
  alert_message TEXT;
BEGIN
  -- Loop through all clocked-in staff
  FOR staff_record IN 
    SELECT 
      a.staff_user_id,
      a.last_activity_at,
      u.name as staff_name
    FROM hr_staff_attendance a
    JOIN users u ON a.staff_user_id = u.id
    WHERE a.is_active = TRUE
      AND DATE(a.clock_in_time) = CURRENT_DATE
  LOOP
    -- Calculate idle time in minutes
    idle_minutes := EXTRACT(EPOCH FROM (NOW() - staff_record.last_activity_at)) / 60;
    
    -- If idle for more than 30 minutes, generate alert
    IF idle_minutes > 30 THEN
      alert_message := format(
        '%s has been idle for %s minutes',
        staff_record.staff_name,
        idle_minutes::INTEGER
      );
      
      -- Insert alert (only if one doesn't exist for the last hour)
      INSERT INTO hr_performance_alerts (
        staff_user_id,
        alert_type,
        message,
        severity
      )
      SELECT 
        staff_record.staff_user_id,
        'extended_idle',
        alert_message,
        CASE 
          WHEN idle_minutes > 60 THEN 'high'
          WHEN idle_minutes > 45 THEN 'medium'
          ELSE 'low'
        END
      WHERE NOT EXISTS (
        SELECT 1 
        FROM hr_performance_alerts
        WHERE staff_user_id = staff_record.staff_user_id
          AND alert_type = 'extended_idle'
          AND created_at > NOW() - INTERVAL '1 hour'
          AND is_resolved = FALSE
      );
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- FUNCTION: Calculate Daily Metrics for All Staff
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_daily_metrics_for_all_staff()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_record RECORD;
  metrics_data RECORD;
BEGIN
  -- Loop through all HR staff
  FOR staff_record IN 
    SELECT id, name
    FROM users
    WHERE role = 'hr_staff'
  LOOP
    -- Calculate metrics for the staff member
    SELECT 
      COUNT(*) as total_calls,
      SUM(call_duration) as total_call_duration,
      AVG(call_duration) as avg_call_duration,
      COUNT(*) FILTER (WHERE status IN ('joined', 'hot_lead', 'callback')) as successful_calls,
      CASE 
        WHEN COUNT(*) > 0 THEN
          (COUNT(*) FILTER (WHERE status IN ('joined', 'hot_lead', 'callback'))::FLOAT / COUNT(*) * 100)
        ELSE 0
      END as conversion_rate,
      AVG(response_time_hours) as avg_response_time,
      AVG(call_quality_score) as avg_quality_score
    INTO metrics_data
    FROM hr_call_tracking
    WHERE staff_user_id = staff_record.id
      AND DATE(called_date) = CURRENT_DATE;
    
    -- Get attendance data
    DECLARE
      attendance_hours FLOAT;
      idle_hours FLOAT;
    BEGIN
      SELECT 
        COALESCE(total_work_duration_seconds, 0) / 3600.0,
        COALESCE(total_idle_duration_seconds, 0) / 3600.0
      INTO attendance_hours, idle_hours
      FROM hr_staff_attendance
      WHERE staff_user_id = staff_record.id
        AND DATE(clock_in_time) = CURRENT_DATE;
    END;
    
    -- Insert or update daily metrics
    INSERT INTO hr_staff_daily_metrics (
      staff_user_id,
      date,
      total_calls,
      total_call_duration_seconds,
      avg_call_duration_seconds,
      successful_calls,
      conversion_rate,
      total_active_hours,
      total_idle_hours,
      avg_response_time_hours,
      quality_score
    ) VALUES (
      staff_record.id,
      CURRENT_DATE,
      COALESCE(metrics_data.total_calls, 0),
      COALESCE(metrics_data.total_call_duration, 0),
      COALESCE(metrics_data.avg_call_duration, 0),
      COALESCE(metrics_data.successful_calls, 0),
      COALESCE(metrics_data.conversion_rate, 0),
      COALESCE(attendance_hours, 0),
      COALESCE(idle_hours, 0),
      COALESCE(metrics_data.avg_response_time, 0),
      COALESCE(metrics_data.avg_quality_score, 0)
    )
    ON CONFLICT (staff_user_id, date)
    DO UPDATE SET
      total_calls = EXCLUDED.total_calls,
      total_call_duration_seconds = EXCLUDED.total_call_duration_seconds,
      avg_call_duration_seconds = EXCLUDED.avg_call_duration_seconds,
      successful_calls = EXCLUDED.successful_calls,
      conversion_rate = EXCLUDED.conversion_rate,
      total_active_hours = EXCLUDED.total_active_hours,
      total_idle_hours = EXCLUDED.total_idle_hours,
      avg_response_time_hours = EXCLUDED.avg_response_time_hours,
      quality_score = EXCLUDED.quality_score,
      updated_at = NOW();
  END LOOP;
END;
$$;

-- =====================================================
-- FUNCTION: Auto Clock-Out Inactive Staff
-- =====================================================
CREATE OR REPLACE FUNCTION auto_clock_out_inactive_staff()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_record RECORD;
  work_duration INTEGER;
BEGIN
  -- Loop through all clocked-in staff
  FOR staff_record IN 
    SELECT *
    FROM hr_staff_attendance
    WHERE is_active = TRUE
      AND clock_out_time IS NULL
  LOOP
    -- Auto clock-out if:
    -- 1. No activity for more than 2 hours
    -- 2. Clocked in for more than 12 hours
    
    IF (
      (staff_record.last_activity_at IS NOT NULL AND 
       NOW() - staff_record.last_activity_at > INTERVAL '2 hours')
      OR
      (NOW() - staff_record.clock_in_time > INTERVAL '12 hours')
    ) THEN
      -- Calculate work duration
      work_duration := EXTRACT(EPOCH FROM (NOW() - staff_record.clock_in_time))::INTEGER;
      
      -- Update attendance record
      UPDATE hr_staff_attendance
      SET 
        clock_out_time = NOW(),
        total_work_duration_seconds = work_duration,
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = staff_record.id;
      
      -- Generate alert
      INSERT INTO hr_performance_alerts (
        staff_user_id,
        alert_type,
        message,
        severity
      ) VALUES (
        staff_record.staff_user_id,
        'auto_clocked_out',
        'Automatically clocked out due to inactivity',
        'medium'
      );
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- SCHEDULE CRON JOBS
-- =====================================================

-- Run target checks every hour
SELECT cron.schedule(
  'check-targets-hourly',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT check_targets_and_generate_alerts();$$
);

-- Run idle checks every 30 minutes
SELECT cron.schedule(
  'check-idle-staff',
  '*/30 * * * *',  -- Every 30 minutes
  $$SELECT check_idle_staff_and_generate_alerts();$$
);

-- Run daily metrics calculation at 11:59 PM
SELECT cron.schedule(
  'calculate-daily-metrics',
  '59 23 * * *',  -- Every day at 11:59 PM
  $$SELECT calculate_daily_metrics_for_all_staff();$$
);

-- Run auto clock-out check every 2 hours
SELECT cron.schedule(
  'auto-clock-out-check',
  '0 */2 * * *',  -- Every 2 hours
  $$SELECT auto_clock_out_inactive_staff();$$
);

-- =====================================================
-- MANUAL EXECUTION FUNCTIONS (for testing)
-- =====================================================

-- To manually run any of these functions:
-- SELECT check_targets_and_generate_alerts();
-- SELECT check_idle_staff_and_generate_alerts();
-- SELECT calculate_daily_metrics_for_all_staff();
-- SELECT auto_clock_out_inactive_staff();

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('job-name');

