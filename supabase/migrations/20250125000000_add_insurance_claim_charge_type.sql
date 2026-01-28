-- Add 'insurance_claim_charge' to the penalty transaction types
-- Also increase the VARCHAR size to accommodate longer type names

-- First, increase the column size from VARCHAR(20) to VARCHAR(50) to accommodate longer type names
ALTER TABLE public.driver_penalty_transactions 
ALTER COLUMN type TYPE VARCHAR(50);

-- Drop the existing constraint
ALTER TABLE public.driver_penalty_transactions 
DROP CONSTRAINT IF EXISTS driver_penalty_transactions_type_check;

-- Add the updated constraint with all valid types including insurance_claim_charge
ALTER TABLE public.driver_penalty_transactions 
ADD CONSTRAINT driver_penalty_transactions_type_check 
CHECK (type IN ('penalty', 'penalty_paid', 'bonus', 'refund', 'due', 'extra_collection', 'insurance_claim_charge'));

-- Update the column comment
COMMENT ON COLUMN public.driver_penalty_transactions.type IS 'Transaction type: penalty, penalty_paid, bonus, refund, due, extra_collection, or insurance_claim_charge';



