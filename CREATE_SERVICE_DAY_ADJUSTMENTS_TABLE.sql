-- Create service_day_adjustments table for manager-assigned service day adjustments
CREATE TABLE IF NOT EXISTS service_day_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_name VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(20),
    adjustment_date DATE NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 300.00,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one adjustment per driver per date
    CONSTRAINT unique_service_day_adjustment UNIQUE(user_id, adjustment_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_day_adjustments_user_id ON service_day_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_service_day_adjustments_date ON service_day_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_service_day_adjustments_user_date ON service_day_adjustments(user_id, adjustment_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_day_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_day_adjustments_updated_at
    BEFORE UPDATE ON service_day_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_service_day_adjustments_updated_at();
