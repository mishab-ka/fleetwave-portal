-- ============================================
-- Create Resigned Feedback Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.resigned_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    driver_name TEXT NOT NULL,
    driver_id TEXT,
    vehicle_number TEXT,
    resigning_date DATE,
    resignation_reason TEXT,
    feedback_text TEXT NOT NULL,
    overall_experience VARCHAR(50) CHECK (overall_experience IN ('excellent', 'good', 'average', 'poor')),
    would_recommend BOOLEAN,
    additional_comments TEXT,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.resigned_feedback IS 'Feedback submitted by resigned drivers';
COMMENT ON COLUMN public.resigned_feedback.user_id IS 'Reference to the driver who submitted feedback';
COMMENT ON COLUMN public.resigned_feedback.driver_name IS 'Driver name at time of submission';
COMMENT ON COLUMN public.resigned_feedback.driver_id IS 'Driver ID at time of submission';
COMMENT ON COLUMN public.resigned_feedback.vehicle_number IS 'Vehicle number at time of submission';
COMMENT ON COLUMN public.resigned_feedback.resigning_date IS 'Date when driver resigned';
COMMENT ON COLUMN public.resigned_feedback.resignation_reason IS 'Reason for resignation';
COMMENT ON COLUMN public.resigned_feedback.feedback_text IS 'Main feedback text (required)';
COMMENT ON COLUMN public.resigned_feedback.overall_experience IS 'Overall experience rating';
COMMENT ON COLUMN public.resigned_feedback.would_recommend IS 'Would driver recommend the company';

-- ============================================
-- Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_resigned_feedback_user_id ON public.resigned_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_resigned_feedback_submission_date ON public.resigned_feedback(submission_date);
CREATE INDEX IF NOT EXISTS idx_resigned_feedback_resigning_date ON public.resigned_feedback(resigning_date);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.resigned_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for Resigned Feedback
-- ============================================

-- INSERT: Allow all authenticated users to INSERT (drivers can submit feedback)
CREATE POLICY "allow_insert_resigned_feedback"
ON public.resigned_feedback
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- SELECT: Users can see their own feedback; Admin/Manager/Accountant can see all
CREATE POLICY "allow_select_resigned_feedback"
ON public.resigned_feedback
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
CREATE POLICY "allow_update_resigned_feedback"
ON public.resigned_feedback
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
CREATE POLICY "allow_delete_resigned_feedback"
ON public.resigned_feedback
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
-- Note: update_updated_at_column() function should already exist from previous migrations
DROP TRIGGER IF EXISTS update_resigned_feedback_updated_at ON public.resigned_feedback;
CREATE TRIGGER update_resigned_feedback_updated_at
BEFORE UPDATE ON public.resigned_feedback
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

