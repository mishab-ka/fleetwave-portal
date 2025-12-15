-- HR Performance Monitoring System - Database Schema
-- This script creates all tables needed for remote staff performance monitoring

-- ============================================================================
-- 1. HR Staff Attendance Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  total_hours DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'missed', 'auto_clocked_out')),
  last_activity_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(staff_user_id, date)
);

-- Indexes for hr_staff_attendance
CREATE INDEX IF NOT EXISTS idx_hr_attendance_staff_user ON hr_staff_attendance(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_date ON hr_staff_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_status ON hr_staff_attendance(status);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_staff_date ON hr_staff_attendance(staff_user_id, date DESC);

-- ============================================================================
-- 2. HR Staff Targets Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('daily', 'weekly', 'monthly')),
  target_calls INTEGER DEFAULT 0,
  target_conversions INTEGER DEFAULT 0,
  target_duration INTEGER DEFAULT 0, -- in minutes
  target_work_hours DECIMAL(5,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false, -- true if applies to all staff
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for hr_staff_targets
CREATE INDEX IF NOT EXISTS idx_hr_targets_staff_user ON hr_staff_targets(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_targets_type ON hr_staff_targets(target_type);
CREATE INDEX IF NOT EXISTS idx_hr_targets_active ON hr_staff_targets(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_targets_global ON hr_staff_targets(is_global);
CREATE INDEX IF NOT EXISTS idx_hr_targets_dates ON hr_staff_targets(start_date, end_date);

-- ============================================================================
-- 3. HR Staff Daily Metrics Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Call metrics
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- in seconds
  avg_duration DECIMAL(10,2) DEFAULT 0, -- in seconds
  
  -- Lead metrics
  leads_contacted INTEGER DEFAULT 0,
  hot_leads_generated INTEGER DEFAULT 0,
  joined_count INTEGER DEFAULT 0,
  callback_scheduled INTEGER DEFAULT 0,
  
  -- Performance metrics
  conversion_rate DECIMAL(5,2) DEFAULT 0, -- percentage
  first_activity_time TIMESTAMP WITH TIME ZONE,
  last_activity_time TIMESTAMP WITH TIME ZONE,
  active_hours DECIMAL(5,2) DEFAULT 0,
  
  -- Target achievement
  target_achievement_percentage DECIMAL(5,2) DEFAULT 0,
  calls_target INTEGER DEFAULT 0,
  conversions_target INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_response_time_hours DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 0,
  
  -- Breakdown (JSON)
  status_breakdown JSONB DEFAULT '{}',
  source_breakdown JSONB DEFAULT '{}',
  hourly_breakdown JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(staff_user_id, date)
);

-- Indexes for hr_staff_daily_metrics
CREATE INDEX IF NOT EXISTS idx_hr_daily_metrics_staff_user ON hr_staff_daily_metrics(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_daily_metrics_date ON hr_staff_daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_hr_daily_metrics_staff_date ON hr_staff_daily_metrics(staff_user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_hr_daily_metrics_conversion ON hr_staff_daily_metrics(conversion_rate);

-- ============================================================================
-- 4. HR Performance Alerts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'target_missed', 'low_activity', 'no_clock_in', 'idle_time', 
    'late_clock_in', 'early_clock_out', 'low_conversion', 'no_calls',
    'target_50_percent', 'target_achieved', 'excellent_performance'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  date DATE NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for hr_performance_alerts
CREATE INDEX IF NOT EXISTS idx_hr_alerts_staff_user ON hr_performance_alerts(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_type ON hr_performance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_severity ON hr_performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_date ON hr_performance_alerts(date DESC);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_read ON hr_performance_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_resolved ON hr_performance_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_created ON hr_performance_alerts(created_at DESC);

-- ============================================================================
-- 5. HR Staff Activity Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'clock_in', 'clock_out', 'call_started', 'call_completed', 
    'lead_viewed', 'lead_updated', 'status_updated', 'whatsapp_sent',
    'page_viewed', 'search_performed', 'export_data', 'note_added'
  )),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for hr_staff_activity_log
CREATE INDEX IF NOT EXISTS idx_hr_activity_staff_user ON hr_staff_activity_log(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_activity_type ON hr_staff_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_hr_activity_timestamp ON hr_staff_activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hr_activity_staff_timestamp ON hr_staff_activity_log(staff_user_id, timestamp DESC);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
ALTER TABLE hr_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for hr_staff_attendance
-- ============================================================================

-- Staff can view their own attendance
CREATE POLICY "Staff can view own attendance"
ON hr_staff_attendance FOR SELECT
USING (
  staff_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- Staff can insert their own attendance
CREATE POLICY "Staff can insert own attendance"
ON hr_staff_attendance FOR INSERT
WITH CHECK (staff_user_id = auth.uid());

-- Staff can update their own attendance
CREATE POLICY "Staff can update own attendance"
ON hr_staff_attendance FOR UPDATE
USING (
  staff_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- ============================================================================
-- RLS Policies for hr_staff_targets
-- ============================================================================

-- Staff can view their own targets and global targets
CREATE POLICY "Staff can view targets"
ON hr_staff_targets FOR SELECT
USING (
  staff_user_id = auth.uid() OR
  is_global = true OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- Only managers can create/update targets
CREATE POLICY "Managers can manage targets"
ON hr_staff_targets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- ============================================================================
-- RLS Policies for hr_staff_daily_metrics
-- ============================================================================

-- Staff can view their own metrics
CREATE POLICY "Staff can view own metrics"
ON hr_staff_daily_metrics FOR SELECT
USING (
  staff_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- System can insert/update metrics
CREATE POLICY "System can manage metrics"
ON hr_staff_daily_metrics FOR ALL
USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS Policies for hr_performance_alerts
-- ============================================================================

-- Staff can view their own alerts
CREATE POLICY "Staff can view own alerts"
ON hr_performance_alerts FOR SELECT
USING (
  staff_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- Staff can mark their alerts as read
CREATE POLICY "Staff can update own alerts"
ON hr_performance_alerts FOR UPDATE
USING (staff_user_id = auth.uid());

-- System can create alerts
CREATE POLICY "System can create alerts"
ON hr_performance_alerts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Managers can resolve alerts
CREATE POLICY "Managers can resolve alerts"
ON hr_performance_alerts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- ============================================================================
-- RLS Policies for hr_staff_activity_log
-- ============================================================================

-- Staff can view their own activity
CREATE POLICY "Staff can view own activity"
ON hr_staff_activity_log FOR SELECT
USING (
  staff_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('hr_manager', 'admin')
  )
);

-- Staff can log their own activity
CREATE POLICY "Staff can log own activity"
ON hr_staff_activity_log FOR INSERT
WITH CHECK (staff_user_id = auth.uid());

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table
CREATE TRIGGER update_hr_staff_attendance_updated_at
  BEFORE UPDATE ON hr_staff_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_staff_targets_updated_at
  BEFORE UPDATE ON hr_staff_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_staff_daily_metrics_updated_at
  BEFORE UPDATE ON hr_staff_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE hr_staff_attendance IS 'Tracks HR staff clock-in/out times and work sessions';
COMMENT ON TABLE hr_staff_targets IS 'Stores performance targets for HR staff (daily/weekly/monthly)';
COMMENT ON TABLE hr_staff_daily_metrics IS 'Cached daily performance metrics for HR staff';
COMMENT ON TABLE hr_performance_alerts IS 'Performance alerts and notifications for managers';
COMMENT ON TABLE hr_staff_activity_log IS 'Detailed activity log for HR staff actions';

COMMENT ON COLUMN hr_staff_attendance.last_activity_time IS 'Last recorded activity timestamp for idle detection';
COMMENT ON COLUMN hr_staff_targets.is_global IS 'If true, applies to all staff members';
COMMENT ON COLUMN hr_staff_daily_metrics.status_breakdown IS 'JSON breakdown of calls by status';
COMMENT ON COLUMN hr_staff_daily_metrics.source_breakdown IS 'JSON breakdown of calls by source';
COMMENT ON COLUMN hr_staff_daily_metrics.hourly_breakdown IS 'JSON breakdown of calls by hour';
COMMENT ON COLUMN hr_performance_alerts.metadata IS 'Additional alert context and data';
COMMENT ON COLUMN hr_staff_activity_log.metadata IS 'Additional activity context (lead_id, page, etc.)';

