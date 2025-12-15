-- =====================================================
-- HR PERFORMANCE MONITORING - CORRECTED SCHEMA
-- =====================================================
-- This schema matches the actual code implementation
-- Run this in your Supabase SQL Editor
-- =====================================================

-- ============================================================================
-- 1. HR Staff Attendance Table (CORRECTED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  total_work_duration_seconds INTEGER DEFAULT 0,
  total_idle_duration_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_attendance_staff_user ON hr_staff_attendance(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_clock_in ON hr_staff_attendance(clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_active ON hr_staff_attendance(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_last_activity ON hr_staff_attendance(last_activity_at DESC);

-- Unique constraint: One attendance record per staff per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_attendance_staff_date_unique 
ON hr_staff_attendance(staff_user_id, DATE(clock_in_time));

-- ============================================================================
-- 2. HR Staff Targets Table (CORRECTED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_targets_staff_user ON hr_staff_targets(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_targets_type ON hr_staff_targets(target_type);
CREATE INDEX IF NOT EXISTS idx_hr_targets_active ON hr_staff_targets(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_targets_period ON hr_staff_targets(period);

-- ============================================================================
-- 3. HR Staff Daily Metrics Table (CORRECTED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Call metrics
  total_calls INTEGER DEFAULT 0,
  total_call_duration_seconds INTEGER DEFAULT 0,
  avg_call_duration_seconds INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Work metrics
  total_active_hours DECIMAL(5,2) DEFAULT 0,
  total_idle_hours DECIMAL(5,2) DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_hours DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 0,
  
  -- Target tracking
  calls_target INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_daily_metrics_staff_user ON hr_staff_daily_metrics(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_daily_metrics_date ON hr_staff_daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_hr_daily_metrics_staff_date ON hr_staff_daily_metrics(staff_user_id, date DESC);

-- Unique constraint: One metrics record per staff per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_daily_metrics_staff_date_unique 
ON hr_staff_daily_metrics(staff_user_id, date);

-- ============================================================================
-- 4. HR Performance Alerts Table (CORRECTED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  related_target_id UUID REFERENCES hr_staff_targets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_alerts_staff_user ON hr_performance_alerts(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_type ON hr_performance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_severity ON hr_performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_resolved ON hr_performance_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_created ON hr_performance_alerts(created_at DESC);

-- ============================================================================
-- 5. HR Staff Activity Log Table (CORRECTED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_staff_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_activity_staff_user ON hr_staff_activity_log(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_activity_type ON hr_staff_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_hr_activity_created ON hr_staff_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_activity_staff_created ON hr_staff_activity_log(staff_user_id, created_at DESC);

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view own attendance" ON hr_staff_attendance;
DROP POLICY IF EXISTS "Staff can insert own attendance" ON hr_staff_attendance;
DROP POLICY IF EXISTS "Staff can update own attendance" ON hr_staff_attendance;

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

DROP POLICY IF EXISTS "Staff can view targets" ON hr_staff_targets;
DROP POLICY IF EXISTS "Managers can manage targets" ON hr_staff_targets;

-- Staff can view their own targets
CREATE POLICY "Staff can view targets"
ON hr_staff_targets FOR SELECT
USING (
  staff_user_id = auth.uid() OR
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

DROP POLICY IF EXISTS "Staff can view own metrics" ON hr_staff_daily_metrics;
DROP POLICY IF EXISTS "System can manage metrics" ON hr_staff_daily_metrics;

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

DROP POLICY IF EXISTS "Staff can view own alerts" ON hr_performance_alerts;
DROP POLICY IF EXISTS "Staff can update own alerts" ON hr_performance_alerts;
DROP POLICY IF EXISTS "System can create alerts" ON hr_performance_alerts;
DROP POLICY IF EXISTS "Managers can resolve alerts" ON hr_performance_alerts;

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

DROP POLICY IF EXISTS "Staff can view own activity" ON hr_staff_activity_log;
DROP POLICY IF EXISTS "Staff can log own activity" ON hr_staff_activity_log;

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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_hr_staff_attendance_updated_at ON hr_staff_attendance;
DROP TRIGGER IF EXISTS update_hr_staff_targets_updated_at ON hr_staff_targets;
DROP TRIGGER IF EXISTS update_hr_staff_daily_metrics_updated_at ON hr_staff_daily_metrics;

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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify tables were created:

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'hr_%'
ORDER BY table_name;

-- Check hr_staff_attendance columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hr_staff_attendance'
ORDER BY ordinal_position;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
-- If no errors, your HR Performance Monitoring tables are ready!

