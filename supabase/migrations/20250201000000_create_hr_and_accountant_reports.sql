-- ============================================
-- Create HR Reports and Accountant Reports Tables
-- ============================================

-- ============================================
-- HR Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.hr_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    submitted_by_name VARCHAR(255) NOT NULL,
    report_date DATE NOT NULL,
    total_calls_made INTEGER NOT NULL DEFAULT 0,
    total_confirmations INTEGER NOT NULL DEFAULT 0,
    total_joining INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'approved', 'rejected')),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, report_date)
);

-- Add comments
COMMENT ON TABLE public.hr_reports IS 'HR department reports tracking calls, confirmations, and joining';
COMMENT ON COLUMN public.hr_reports.total_calls_made IS 'Total number of calls made by HR';
COMMENT ON COLUMN public.hr_reports.total_confirmations IS 'Total number of confirmations received';
COMMENT ON COLUMN public.hr_reports.total_joining IS 'Total number of people who joined';

-- ============================================
-- Accountant Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.accountant_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    submitted_by_name VARCHAR(255) NOT NULL,
    report_date DATE NOT NULL,
    total_income DECIMAL(12, 2) DEFAULT 0,
    total_expenses DECIMAL(12, 2) DEFAULT 0,
    net_profit DECIMAL(12, 2) DEFAULT 0,
    cash_flow DECIMAL(12, 2) DEFAULT 0,
    accounts_receivable DECIMAL(12, 2) DEFAULT 0,
    accounts_payable DECIMAL(12, 2) DEFAULT 0,
    bank_balance DECIMAL(12, 2) DEFAULT 0,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'approved', 'rejected')),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, report_date)
);

-- Add comments
COMMENT ON TABLE public.accountant_reports IS 'Accountant department financial reports';
COMMENT ON COLUMN public.accountant_reports.total_income IS 'Total income for the period';
COMMENT ON COLUMN public.accountant_reports.total_expenses IS 'Total expenses for the period';
COMMENT ON COLUMN public.accountant_reports.net_profit IS 'Net profit (income - expenses)';
COMMENT ON COLUMN public.accountant_reports.cash_flow IS 'Cash flow amount';
COMMENT ON COLUMN public.accountant_reports.accounts_receivable IS 'Amounts receivable';
COMMENT ON COLUMN public.accountant_reports.accounts_payable IS 'Amounts payable';
COMMENT ON COLUMN public.accountant_reports.bank_balance IS 'Current bank balance';

-- ============================================
-- Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_hr_reports_user_id ON public.hr_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_reports_report_date ON public.hr_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_hr_reports_status ON public.hr_reports(status);
CREATE INDEX IF NOT EXISTS idx_hr_reports_submission_date ON public.hr_reports(submission_date);

CREATE INDEX IF NOT EXISTS idx_accountant_reports_user_id ON public.accountant_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_accountant_reports_report_date ON public.accountant_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_accountant_reports_status ON public.accountant_reports(status);
CREATE INDEX IF NOT EXISTS idx_accountant_reports_submission_date ON public.accountant_reports(submission_date);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.hr_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for HR Reports
-- ============================================

-- INSERT: Allow Admin, Manager, Accountant, HR roles to INSERT
CREATE POLICY "allow_insert_hr_reports"
ON public.hr_reports
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant', 'hr', 'hr_manager', 'hr_staff')
    )
);

-- SELECT: Users can see their own, Staff can see all
CREATE POLICY "allow_select_hr_reports"
ON public.hr_reports
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant', 'hr', 'hr_manager', 'hr_staff')
    )
);

-- UPDATE: Only Admin can update
CREATE POLICY "allow_update_hr_reports"
ON public.hr_reports
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

-- DELETE: Only Admin can delete
CREATE POLICY "allow_delete_hr_reports"
ON public.hr_reports
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
-- RLS Policies for Accountant Reports
-- ============================================

-- INSERT: Allow Admin, Manager, Accountant roles to INSERT
CREATE POLICY "allow_insert_accountant_reports"
ON public.accountant_reports
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'manager', 'accountant')
    )
);

-- SELECT: Users can see their own, Staff can see all
CREATE POLICY "allow_select_accountant_reports"
ON public.accountant_reports
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

-- UPDATE: Only Admin can update
CREATE POLICY "allow_update_accountant_reports"
ON public.accountant_reports
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

-- DELETE: Only Admin can delete
CREATE POLICY "allow_delete_accountant_reports"
ON public.accountant_reports
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
-- Create updated_at trigger function (if not exists)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_hr_reports_updated_at 
    BEFORE UPDATE ON public.hr_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accountant_reports_updated_at 
    BEFORE UPDATE ON public.accountant_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();




