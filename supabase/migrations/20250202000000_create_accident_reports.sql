-- ============================================
-- Create Accident Reports Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.accident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    submitted_by_name TEXT NOT NULL,
    vehicle_id UUID,
    vehicle_number TEXT NOT NULL,
    shift VARCHAR(20) NOT NULL CHECK (shift IN ('Morning', 'Night', '24 Hours')),
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    driver_name TEXT NOT NULL,
    description TEXT NOT NULL,
    place TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Running', 'Not Running Condition')),
    penalty_amount DECIMAL(12, 2) DEFAULT 0,
    verification_status VARCHAR(50) DEFAULT 'pending_verification' CHECK (verification_status IN ('pending_verification', 'approved', 'rejected')),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.accident_reports IS 'Accident reports submitted by users';
COMMENT ON COLUMN public.accident_reports.vehicle_id IS 'Optional vehicle ID reference (no FK constraint to avoid dependency issues)';
COMMENT ON COLUMN public.accident_reports.vehicle_number IS 'Vehicle number for reference (stored even if vehicle is deleted)';
COMMENT ON COLUMN public.accident_reports.driver_name IS 'Driver name for reference (stored even if driver is deleted)';
COMMENT ON COLUMN public.accident_reports.shift IS 'Shift during which accident occurred: Morning, Night, or 24 Hours';
COMMENT ON COLUMN public.accident_reports.status IS 'Vehicle status after accident: Running or Not Running Condition';
COMMENT ON COLUMN public.accident_reports.penalty_amount IS 'Penalty amount for the accident (₹)';
COMMENT ON COLUMN public.accident_reports.verification_status IS 'Report verification status: pending_verification, approved, or rejected';

-- ============================================
-- Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accident_reports_user_id ON public.accident_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_vehicle_id ON public.accident_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_submission_date ON public.accident_reports(submission_date);
CREATE INDEX IF NOT EXISTS idx_accident_reports_status ON public.accident_reports(status);
CREATE INDEX IF NOT EXISTS idx_accident_reports_vehicle_number ON public.accident_reports(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_accident_reports_driver_id ON public.accident_reports(driver_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_verification_status ON public.accident_reports(verification_status);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.accident_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for Accident Reports
-- ============================================

-- INSERT: Allow all authenticated users to INSERT
CREATE POLICY "allow_insert_accident_reports"
ON public.accident_reports
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- SELECT: Users can see their own reports; Admin/Manager can see all
CREATE POLICY "allow_select_accident_reports"
ON public.accident_reports
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- UPDATE: Only Admin can UPDATE
CREATE POLICY "allow_update_accident_reports"
ON public.accident_reports
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- DELETE: Only Admin can DELETE
CREATE POLICY "allow_delete_accident_reports"
ON public.accident_reports
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- ============================================
-- Trigger for updated_at
-- ============================================
-- Note: update_updated_at_column() function is created in 20250201000000_create_hr_and_accountant_reports.sql
DROP TRIGGER IF EXISTS update_accident_reports_updated_at ON public.accident_reports;
CREATE TRIGGER update_accident_reports_updated_at
BEFORE UPDATE ON public.accident_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

