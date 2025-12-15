-- =====================================================
-- FIX HR TABLES - Drop and Recreate with Correct FKs
-- =====================================================
-- This will drop existing tables and recreate them
-- with correct foreign key references to users table
-- =====================================================

-- ============================================================================
-- STEP 1: Drop all existing HR tables (in correct order due to dependencies)
-- ============================================================================

DROP TABLE IF EXISTS hr_staff_activity_log CASCADE;
DROP TABLE IF EXISTS hr_performance_alerts CASCADE;
DROP TABLE IF EXISTS hr_staff_daily_metrics CASCADE;
DROP TABLE IF EXISTS hr_staff_targets CASCADE;
DROP TABLE IF EXISTS hr_staff_attendance CASCADE;

-- ============================================================================
-- STEP 2: Create tables with correct foreign keys (users, not auth.users)
-- ============================================================================

CREATE TABLE hr_staff_attendance (
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

CREATE TABLE hr_staff_targets (
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

CREATE TABLE hr_staff_daily_metrics (
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

CREATE TABLE hr_performance_alerts (
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

CREATE TABLE hr_staff_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create indexes
-- ============================================================================

CREATE INDEX idx_hr_attendance_staff ON hr_staff_attendance(staff_user_id);
CREATE INDEX idx_hr_attendance_clock_in ON hr_staff_attendance(clock_in_time);
CREATE INDEX idx_hr_attendance_active ON hr_staff_attendance(is_active);

CREATE INDEX idx_hr_targets_staff ON hr_staff_targets(staff_user_id);
CREATE INDEX idx_hr_targets_active ON hr_staff_targets(is_active);

CREATE INDEX idx_hr_metrics_staff ON hr_staff_daily_metrics(staff_user_id);
CREATE INDEX idx_hr_metrics_date ON hr_staff_daily_metrics(date);

CREATE INDEX idx_hr_alerts_staff ON hr_performance_alerts(staff_user_id);
CREATE INDEX idx_hr_alerts_resolved ON hr_performance_alerts(is_resolved);

CREATE INDEX idx_hr_activity_staff ON hr_staff_activity_log(staff_user_id);
CREATE INDEX idx_hr_activity_created ON hr_staff_activity_log(created_at);

-- ============================================================================
-- STEP 4: Enable RLS
-- ============================================================================

ALTER TABLE hr_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_staff_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS Policies
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
-- STEP 6: Create triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- STEP 7: Refresh Supabase schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ SUCCESS! All HR tables recreated with correct foreign keys!' as status;

SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as columns
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'hr_%'
ORDER BY table_name;

