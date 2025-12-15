-- Create trigger to automatically process extra collection when rent is submitted/approved
-- This assumes you have a rent_submissions or similar table where rent payments are tracked

-- First, let's create a sample rent_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rent_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rent_date DATE NOT NULL,
    amount_collected DECIMAL(10,2) NOT NULL,
    standard_rent DECIMAL(10,2) DEFAULT 600.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rent_submissions_user_id ON public.rent_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_rent_submissions_rent_date ON public.rent_submissions(rent_date);
CREATE INDEX IF NOT EXISTS idx_rent_submissions_status ON public.rent_submissions(status);

-- Enable RLS
ALTER TABLE public.rent_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own rent submissions" ON public.rent_submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all rent submissions" ON public.rent_submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create trigger function to process extra collection when rent is approved
CREATE OR REPLACE FUNCTION trigger_process_extra_collection()
RETURNS TRIGGER AS $$
DECLARE
    result JSON;
BEGIN
    -- Only process when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Call the processing function
        SELECT process_rent_with_extra_collection(
            NEW.user_id,
            NEW.rent_date,
            NEW.amount_collected,
            NEW.standard_rent,
            NEW.approved_by
        ) INTO result;
        
        -- Log the result (optional - you can remove this if you don't want logging)
        RAISE NOTICE 'Extra collection processing result: %', result;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS rent_approval_trigger ON public.rent_submissions;
CREATE TRIGGER rent_approval_trigger
    AFTER UPDATE ON public.rent_submissions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_process_extra_collection();

-- Add comments for documentation
COMMENT ON TABLE public.rent_submissions IS 'Tracks rent submissions and payments from drivers';
COMMENT ON COLUMN public.rent_submissions.amount_collected IS 'Total amount collected from driver';
COMMENT ON COLUMN public.rent_submissions.standard_rent IS 'Standard rent amount (default ₹600)';
COMMENT ON COLUMN public.rent_submissions.status IS 'Submission status: pending, approved, or rejected';










