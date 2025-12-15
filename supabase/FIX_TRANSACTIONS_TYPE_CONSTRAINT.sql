-- Fix transactions table type constraint to allow asset and liability types
-- This migration updates the transactions_type_check constraint to include the new transaction types

-- First, check if the constraint exists and drop it
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add the updated constraint with all valid transaction types
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'asset', 'liability', 'Asset', 'Liability'));

-- Add comment for documentation
COMMENT ON CONSTRAINT transactions_type_check ON public.transactions 
IS 'Allows income, expense, asset, liability transaction types (both lowercase and capitalized for backward compatibility)';

-- Verify the constraint was added successfully
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'transactions_type_check' 
AND conrelid = 'public.transactions'::regclass;
