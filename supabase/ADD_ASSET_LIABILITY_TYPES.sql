-- Add asset and liability transaction types to the transactions table
-- This script safely adds the new transaction types to the existing constraint

-- First, try to drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE public.transactions 
    DROP CONSTRAINT IF EXISTS transactions_type_check;
EXCEPTION
    WHEN undefined_object THEN
        -- Constraint doesn't exist, continue
        NULL;
END $$;

-- Add the updated constraint with all valid transaction types
-- Including both lowercase and capitalized versions for backward compatibility
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
