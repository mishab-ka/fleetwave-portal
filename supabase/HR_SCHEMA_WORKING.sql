-- =====================================================
-- HR PERFORMANCE MONITORING - GUARANTEED TO WORK
-- =====================================================
-- Simple schema with NO complex constraints
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Clean up existing policies
DO $$ 
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Staff can view own attendance" ON hr_staff_attendance';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can insert own attendance" ON hr_staff_attendance';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can update own attendance" ON hr_staff_attendance';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can view targets" ON hr_staff_targets';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can manage targets" ON hr_staff_targets';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can view own metrics" ON hr_staff_daily_metrics';
    EXECUTE 'DROP POLICY IF EXISTS "System can manage metrics" ON hr_staff_daily_metrics';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can view own alerts" ON hr_performance_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can update own alerts" ON hr_performance_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "System can create alerts" ON hr_performance_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can resolve alerts" ON hr_performance_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can view own activity" ON hr_staff_activity_log';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can log own activity" ON hr_staff_activity_log';
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- Create tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS hr_staff_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  total_work_duration_seconds INTEGER DEFAULT 0,
  total_idle_duration_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_staff_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_staff_daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_call_duration_seconds INTEGER DEFAULT 0,
  avg_call_duration_seconds INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  total_active_hours DECIMAL(5,2) DEFAULT 0,
  total_idle_hours DECIMAL(5,2) DEFAULT 0,
  avg_response_time_hours DECIMAL(10,2) DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 0,
  calls_target INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  related_target_id UUID REFERENCES hr_staff_targets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_staff_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Create indexes (simple ones only)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hr_attendance_staff ON hr_staff_attendance(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_clock_in ON hr_staff_attendance(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_active ON hr_staff_attendance(is_active);

CREATE INDEX IF NOT EXISTS idx_hr_targets_staff ON hr_staff_targets(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_targets_active ON hr_staff_targets(is_active);

CREATE INDEX IF NOT EXISTS idx_hr_metrics_staff ON hr_staff_daily_metrics(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_metrics_date ON hr_staff_daily_metrics(date);

CREATE INDEX IF NOT EXISTS idx_hr_alerts_staff ON hr_performance_alerts(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_resolved ON hr_performance_alerts(is_resolved);

CREATE INDEX IF NOT EXISTS idx_hr_activity_staff ON hr_staff_activity_log(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_activity_created ON hr_staff_activity_log(created_at);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE hr_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create RLS Policies
-- ============================================================================

CREATE POLICY "Staff can view own attendance" ON hr_staff_attendance FOR SELECT
USING (staff_user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "Staff can insert own attendance" ON hr_staff_attendance FOR INSERT
WITH CHECK (staff_user_id = auth.uid());

CREATE POLICY "Staff can update own attendance" ON hr_staff_attendance FOR UPDATE
USING (staff_user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "Staff can view targets" ON hr_staff_targets FOR SELECT
USING (staff_user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "Managers can manage targets" ON hr_staff_targets FOR ALL
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "Staff can view own metrics" ON hr_staff_daily_metrics FOR SELECT
USING (staff_user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "System can manage metrics" ON hr_staff_daily_metrics FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can view own alerts" ON hr_performance_alerts FOR SELECT
USING (staff_user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "Staff can update own alerts" ON hr_performance_alerts FOR UPDATE
USING (staff_user_id = auth.uid());

CREATE POLICY "System can create alerts" ON hr_performance_alerts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Managers can resolve alerts" ON hr_performance_alerts FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "Staff can view own activity" ON hr_staff_activity_log FOR SELECT
USING (staff_user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('hr_manager', 'admin')));

CREATE POLICY "Staff can log own activity" ON hr_staff_activity_log FOR INSERT
WITH CHECK (staff_user_id = auth.uid());

-- ============================================================================
-- Create triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hr_staff_attendance_updated_at ON hr_staff_attendance;
DROP TRIGGER IF EXISTS update_hr_staff_targets_updated_at ON hr_staff_targets;
DROP TRIGGER IF EXISTS update_hr_staff_daily_metrics_updated_at ON hr_staff_daily_metrics;

CREATE TRIGGER update_hr_staff_attendance_updated_at 
BEFORE UPDATE ON hr_staff_attendance 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_staff_targets_updated_at 
BEFORE UPDATE ON hr_staff_targets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_staff_daily_metrics_updated_at 
BEFORE UPDATE ON hr_staff_daily_metrics 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Refresh Supabase schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ SUCCESS! All HR tables created!' as status;

SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as columns
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'hr_%'
ORDER BY table_name;

