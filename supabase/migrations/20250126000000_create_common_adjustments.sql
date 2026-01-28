-- Create common_adjustments table for comprehensive adjustment management
CREATE TABLE IF NOT EXISTS common_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_name VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(20),
    adjustment_date DATE NOT NULL,
    
    -- Adjustment Details
    category VARCHAR(50) NOT NULL, -- 'service_day', 'bonus', 'penalty', 'refund', 'expense', 'custom'
    amount DECIMAL(10,2) NOT NULL, -- Can be positive or negative
    description TEXT NOT NULL,
    
    -- Approval Workflow
    status VARCHAR(20) DEFAULT 'approved', -- 'pending', 'approved', 'rejected', 'applied'
    
    -- Tracking
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id),
    applied_to_report UUID REFERENCES fleet_reports(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_category CHECK (category IN ('service_day', 'bonus', 'penalty', 'refund', 'expense', 'custom')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'applied'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_common_adjustments_user_id ON common_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_common_adjustments_date ON common_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_common_adjustments_status ON common_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_common_adjustments_user_date ON common_adjustments(user_id, adjustment_date);
CREATE INDEX IF NOT EXISTS idx_common_adjustments_created_by ON common_adjustments(created_by);
CREATE INDEX IF NOT EXISTS idx_common_adjustments_applied_to_report ON common_adjustments(applied_to_report);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_common_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_common_adjustments_updated_at
    BEFORE UPDATE ON common_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_common_adjustments_updated_at();

-- Enable Row Level Security
ALTER TABLE common_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins and managers can view all adjustments
CREATE POLICY "Admin and managers can view all adjustments"
    ON common_adjustments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- RLS Policy: Drivers can view their own adjustments
CREATE POLICY "Drivers can view their own adjustments"
    ON common_adjustments FOR SELECT
    USING (user_id = auth.uid());

-- RLS Policy: Admins and managers can insert adjustments
CREATE POLICY "Admin and managers can insert adjustments"
    ON common_adjustments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- RLS Policy: Admins and managers can update adjustments
CREATE POLICY "Admin and managers can update adjustments"
    ON common_adjustments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- RLS Policy: Only admins can delete adjustments
CREATE POLICY "Only admins can delete adjustments"
    ON common_adjustments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create a function to get adjustments for a specific user and date
CREATE OR REPLACE FUNCTION get_user_adjustments_for_date(
    p_user_id UUID,
    p_date DATE
)
RETURNS TABLE (
    id UUID,
    category VARCHAR(50),
    amount DECIMAL(10,2),
    description TEXT,
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id,
        ca.category,
        ca.amount,
        ca.description,
        ca.status
    FROM common_adjustments ca
    WHERE ca.user_id = p_user_id
    AND ca.adjustment_date = p_date
    AND ca.status = 'approved'
    ORDER BY ca.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to apply adjustment to report
CREATE OR REPLACE FUNCTION apply_adjustment_to_report(
    p_adjustment_id UUID,
    p_report_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE common_adjustments
    SET 
        status = 'applied',
        applied_to_report = p_report_id,
        applied_at = NOW()
    WHERE id = p_adjustment_id
    AND status = 'approved';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE common_adjustments IS 'Comprehensive adjustment management system for drivers with custom amounts and categories';
