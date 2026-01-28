-- Migrate existing service_day_adjustments data to common_adjustments table
INSERT INTO common_adjustments (
    user_id,
    driver_name,
    vehicle_number,
    adjustment_date,
    category,
    amount,
    description,
    status,
    created_by,
    approved_by,
    created_at,
    approved_at
)
SELECT 
    sda.user_id,
    sda.driver_name,
    sda.vehicle_number,
    sda.adjustment_date,
    'service_day' as category,
    -sda.discount_amount as amount, -- Negative because it's a discount
    COALESCE(sda.notes, 'Service day adjustment (migrated from old system)') as description,
    'approved' as status, -- All old adjustments are auto-approved
    sda.created_by,
    sda.created_by as approved_by, -- Same as creator for old data
    sda.created_at,
    sda.created_at as approved_at
FROM service_day_adjustments sda
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN common_adjustments.amount IS 'Amount in rupees. Negative for discounts/deductions, positive for bonuses/refunds';
