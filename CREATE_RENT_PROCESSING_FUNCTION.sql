-- Create function to process rent payments and add extra collection transactions
-- This function will be called when rent is processed to automatically add extra collection transactions
-- Only applies from September 15th, 2024 onwards

CREATE OR REPLACE FUNCTION process_rent_with_extra_collection(
    p_user_id UUID,
    p_rent_date DATE,
    p_amount_collected DECIMAL(10,2),
    p_standard_rent DECIMAL(10,2) DEFAULT 600.00,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    extra_amount DECIMAL(10,2);
    transaction_id UUID;
    result JSON;
BEGIN
    -- Only process extra collection from September 15th, 2024 onwards
    IF p_rent_date < '2024-09-15' THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Rent processed without extra collection (before Sept 15th)',
            'extra_collection_added', false,
            'extra_amount', 0
        );
    END IF;
    
    -- Calculate extra amount
    extra_amount := p_amount_collected - p_standard_rent;
    
    -- If no extra amount, return success without adding transaction
    IF extra_amount <= 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Rent processed without extra collection',
            'extra_collection_added', false,
            'extra_amount', 0
        );
    END IF;
    
    -- Add extra collection transaction
    INSERT INTO public.driver_penalty_transactions (
        user_id,
        amount,
        type,
        description,
        created_at,
        created_by
    ) VALUES (
        p_user_id,
        extra_amount,
        'extra_collection',
        'Extra collection from rent payment - Standard rent: ₹' || p_standard_rent || ', Collected: ₹' || p_amount_collected,
        NOW(),
        p_created_by
    ) RETURNING id INTO transaction_id;
    
    -- Return success with transaction details
    RETURN json_build_object(
        'success', true,
        'message', 'Rent processed with extra collection transaction added',
        'extra_collection_added', true,
        'extra_amount', extra_amount,
        'transaction_id', transaction_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error processing rent: ' || SQLERRM,
            'extra_collection_added', false,
            'extra_amount', 0
        );
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION process_rent_with_extra_collection IS 'Processes rent payments and automatically adds extra collection transactions for amounts above standard rent (₹600). Only applies from September 15th, 2024 onwards.';










